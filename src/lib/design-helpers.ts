import { createServerSupabaseClient } from '@/lib/supabase-client'

interface CreateDesignItemParams {
  eventId: string
  eventDate: string
  designTypeId: string
  customDesignDays?: number
  tenantId: string
}

export async function createDesignItemForEvent({
  eventId,
  eventDate,
  designTypeId,
  customDesignDays,
  tenantId
}: CreateDesignItemParams) {
  const supabase = createServerSupabaseClient()

  // Fetch design type details
  const { data: designType, error: typeError } = await supabase
    .from('design_item_types')
    .select('*')
    .eq('id', designTypeId)
    .eq('tenant_id', tenantId)
    .single()

  if (typeError || !designType) {
    console.error('Design type not found:', typeError)
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
    console.log('Design item already exists for this event and type')
    return existingItem
  }

  // Create design item
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
      due_date: designDeadline.toISOString().split('T')[0]
    })
    .select()
    .single()

  if (itemError) {
    console.error('Error creating design item:', itemError)
    return null
  }

  // Check if tasks table exists before creating task
  const { error: tasksTableError } = await supabase
    .from('tasks')
    .select('id')
    .limit(1)

  if (tasksTableError && tasksTableError.code === '42P01') {
    // Tasks table doesn't exist yet, skip task creation
    console.log('Tasks table does not exist, skipping task creation')
    return designItem
  }

  // Create task
  const taskName = `Design: ${designType.name}`
  const now = new Date()
  const daysUntilDeadline = Math.ceil((designDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      title: taskName,
      description: `Complete ${designType.name} for this event. Due by ${designDeadline.toLocaleDateString()}`,
      due_date: designDeadline.toISOString().split('T')[0],
      priority: daysUntilDeadline <= 7 ? 'high' : 'medium',
      status: 'pending',
      task_type: 'design'
    })
    .select()
    .single()

  if (taskError) {
    console.error('Error creating task:', taskError)
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

export async function createAutoDesignItems(eventId: string, eventDate: string, tenantId: string) {
  const supabase = createServerSupabaseClient()

  // Find all auto-added design types
  const { data: autoTypes, error } = await supabase
    .from('design_item_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_auto_added', true)
    .eq('is_active', true)

  if (error || !autoTypes || autoTypes.length === 0) {
    console.log('No auto-added design types found')
    return []
  }

  console.log(`Creating ${autoTypes.length} auto-added design items for event ${eventId}`)

  // Create design item for each auto type
  const results = []
  for (const type of autoTypes) {
    const item = await createDesignItemForEvent({
      eventId,
      eventDate,
      designTypeId: type.id,
      tenantId
    })
    if (item) results.push(item)
  }

  return results
}

export async function createDesignItemsForProduct({
  eventId,
  eventDate,
  productId,
  tenantId
}: {
  eventId: string
  eventDate: string
  productId: string
  tenantId: string
}) {
  const supabase = createServerSupabaseClient()

  // Fetch product with design requirements
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .single()

  if (productError || !product) {
    console.error('Product not found:', productError)
    return null
  }

  // Check if product requires design
  if (!product.requires_design || !product.design_item_type_id) {
    console.log('Product does not require design')
    return null
  }

  // Create design item
  return await createDesignItemForEvent({
    eventId,
    eventDate,
    designTypeId: product.design_item_type_id,
    customDesignDays: product.design_lead_time_override,
    tenantId
  })
}
