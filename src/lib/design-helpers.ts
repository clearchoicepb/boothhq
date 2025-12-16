import { createServerSupabaseClient } from '@/lib/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib')

interface CreateDesignItemParams {
  eventId: string
  eventDate: string
  designTypeId: string
  customDesignDays?: number
  assignedDesignerId?: string
  tenantId: string
  supabase: SupabaseClient // Pass in the tenant database client
  notes?: string
  createdBy?: string
}

export async function createDesignItemForEvent({
  eventId,
  eventDate,
  designTypeId,
  customDesignDays,
  assignedDesignerId,
  tenantId,
  supabase,
  notes,
  createdBy
}: CreateDesignItemParams) {
  // Use the provided tenant database client instead of creating a new one

  // Fetch design type details
  const { data: designType, error: typeError } = await supabase
    .from('design_item_types')
    .select('*')
    .eq('id', designTypeId)
    .eq('tenant_id', tenantId)
    .single()

  if (typeError || !designType) {
    log.error({ typeError }, 'Design type not found')
    return null
  }

  // Calculate deadlines
  const eventDateTime = new Date(eventDate)

  // Use override if provided, otherwise use defaults
  const designDays = customDesignDays || designType.default_design_days
  const productionDays = designType.default_production_days || 0
  const shippingDays = designType.default_shipping_days || 0

  // Calculate backwards from event date
  // For physical: Event - Shipping - Production - Design = Start
  // For digital: Event - Design = Start

  let designDeadline = new Date(eventDateTime)
  if (designType.type === 'physical') {
    designDeadline.setDate(designDeadline.getDate() - shippingDays - productionDays)
  }

  let designStartDate = new Date(designDeadline)
  designStartDate.setDate(designStartDate.getDate() - designDays)

  // Check if design item already exists for this event and type
  const { data: existingItem } = await supabase
    .from('event_design_items')
    .select('id')
    .eq('event_id', eventId)
    .eq('design_item_type_id', designTypeId)
    .single()

  if (existingItem) {
    log.debug('Design item already exists for this event and type')
    return existingItem
  }

  // Create design item (legacy table - kept for backwards compatibility)
  const { data: designItem, error: itemError } = await supabase
    .from('event_design_items')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      design_item_type_id: designTypeId,
      item_name: designType.name,
      description: designType.description,
      quantity: 1,
      design_start_date: designStartDate.toISOString().split('T')[0],
      design_deadline: designDeadline.toISOString().split('T')[0],
      custom_design_days: customDesignDays || null,
      status: 'pending',
      due_date: designDeadline.toISOString().split('T')[0],
      assigned_designer_id: assignedDesignerId || null,
      internal_notes: notes || null,
      created_by: createdBy || null
    })
    .select()
    .single()

  if (itemError) {
    log.error({ itemError }, 'Error creating design item')
    return null
  }

  // Check if tasks table exists before creating task
  const { error: tasksTableError } = await supabase
    .from('tasks')
    .select('id')
    .limit(1)

  if (tasksTableError && tasksTableError.code === '42P01') {
    // Tasks table doesn't exist yet, skip task creation
    log.debug('Tasks table does not exist, skipping task creation')
    return designItem
  }

  // Create unified task with ALL required fields
  const taskName = `Design: ${designType.name}`
  const now = new Date()
  const daysUntilDeadline = Math.ceil((designDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Determine priority based on deadline
  let priority = 'medium'
  if (daysUntilDeadline <= 7) priority = 'high'
  if (daysUntilDeadline <= 3) priority = 'urgent'

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      tenant_id: tenantId,
      title: taskName,
      description: notes || `Complete ${designType.name} for this event. Due by ${designDeadline.toLocaleDateString()}`,

      // CRITICAL: These fields are required for My Tasks and dashboards
      entity_type: 'event',
      entity_id: eventId,
      assigned_to: assignedDesignerId || null,
      assigned_at: assignedDesignerId ? new Date().toISOString() : null,
      created_by: createdBy || null,

      // Task categorization
      task_type: 'design',
      department: 'design',

      // Dates
      due_date: designDeadline.toISOString().split('T')[0],
      design_deadline: designDeadline.toISOString().split('T')[0],
      design_start_date: designStartDate.toISOString().split('T')[0],

      // Status and priority
      status: 'pending',
      priority: priority,

      // Design-specific fields
      quantity: 1,
      requires_approval: true,
      internal_notes: notes || null,

      // Link to legacy table for migration tracking
      migrated_from_table: 'event_design_items',
      migrated_from_id: designItem.id
    })
    .select()
    .single()

  if (taskError) {
    log.error({ taskError }, 'Error creating task')
  } else {
    // Link task to design item
    await supabase
      .from('event_design_items')
      .update({ task_id: task.id })
      .eq('id', designItem.id)

    return { ...designItem, task_id: task.id }
  }

  return designItem
}

export async function createAutoDesignItems(
  eventId: string,
  eventDate: string,
  tenantId: string,
  supabase: SupabaseClient,
  createdBy?: string
) {
  // Find all auto-added design types
  const { data: autoTypes, error } = await supabase
    .from('design_item_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_auto_added', true)
    .eq('is_active', true)

  if (error || !autoTypes || autoTypes.length === 0) {
    log.debug('No auto-added design types found')
    return []
  }

  log.debug('Creating ${autoTypes.length} auto-added design items for event ${eventId}')

  // Create design item for each auto type
  const results = []
  for (const type of autoTypes) {
    const item = await createDesignItemForEvent({
      eventId,
      eventDate,
      designTypeId: type.id,
      tenantId,
      supabase,
      createdBy
    })
    if (item) results.push(item)
  }

  return results
}

export async function createDesignItemsForProduct({
  eventId,
  eventDate,
  productId,
  tenantId,
  supabase,
  assignedDesignerId,
  notes,
  createdBy
}: {
  eventId: string
  eventDate: string
  productId: string
  tenantId: string
  supabase: SupabaseClient
  assignedDesignerId?: string
  notes?: string
  createdBy?: string
}) {
  // Fetch product with design requirements
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .single()

  if (productError || !product) {
    log.error({ productError }, 'Product not found')
    return null
  }

  // Check if product requires design
  if (!product.requires_design || !product.design_item_type_id) {
    log.debug('Product does not require design')
    return null
  }

  // Create design item
  return await createDesignItemForEvent({
    eventId,
    eventDate,
    designTypeId: product.design_item_type_id,
    customDesignDays: product.design_lead_time_override,
    assignedDesignerId,
    tenantId,
    supabase,
    notes,
    createdBy
  })
}
