/**
 * Event Design Items API
 *
 * Updated to use unified tasks table (task_type = 'design')
 * while maintaining backwards compatibility during migration.
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createDesignItemForEvent, createDesignItemsForProduct } from '@/lib/design-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')

// GET - Fetch all design tasks for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { id } = await params

    // Query unified tasks table with task_type = 'design'
    const { data: designTasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        template:task_templates(id, name, task_type),
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name, email)
      `)
      .eq('entity_type', 'event')
      .eq('entity_id', id)
      .eq('task_type', 'design')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Map to backwards-compatible format for frontend
    const designItems = (designTasks || []).map(task => ({
      ...task,
      // Map unified task fields to legacy field names for frontend compatibility
      item_name: task.title,
      assigned_designer: task.assigned_user,
      assigned_designer_id: task.assigned_to,
      approved_by_user: task.approved_by_user,
      design_item_type: task.template,
      design_item_type_id: task.task_template_id,
      event_id: task.entity_id
    }))

    return NextResponse.json({ designItems })
  } catch (error: any) {
    log.error({ error }, 'Error fetching design items')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a design item for an event
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  try {
    const { id } = await params
    const body = await request.json()
    const {
      design_item_type_id,
      custom_name,
      custom_type,
      event_date,
      custom_design_days,
      custom_production_days,
      custom_shipping_days,
      assigned_designer_id,
      notes,
      product_id
    } = body

    let designItem
    // If product_id is provided, create design item from product
    if (product_id) {
      designItem = await createDesignItemsForProduct({
        eventId: id,
        eventDate: event_date,
        productId: product_id,
        tenantId: dataSourceTenantId,
        supabase,
        assignedDesignerId: assigned_designer_id,
        notes,
        createdBy: session.user.id
      })

      return NextResponse.json({ designItem })
    }

    // If using a template type
    if (design_item_type_id) {
      designItem = await createDesignItemForEvent({
        eventId: id,
        eventDate: event_date,
        designTypeId: design_item_type_id,
        customDesignDays: custom_design_days,
        assignedDesignerId: assigned_designer_id,
        tenantId: dataSourceTenantId,
        supabase,
        notes,
        createdBy: session.user.id
      })

      return NextResponse.json({ designItem })
    }

    // Custom design item (not based on template)
    if (!custom_name) {
      return NextResponse.json(
        { error: 'custom_name is required for custom design items' },
        { status: 400 }
      )
    }

    // Calculate deadlines manually for custom items
    const eventDateTime = new Date(event_date)
    const designDays = custom_design_days || 7
    const productionDays = custom_production_days || 0
    const shippingDays = custom_shipping_days || 0

    let designDeadline = new Date(eventDateTime)
    if (custom_type === 'physical') {
      designDeadline.setDate(designDeadline.getDate() - shippingDays - productionDays)
    }

    let designStartDate = new Date(designDeadline)
    designStartDate.setDate(designStartDate.getDate() - designDays)

    // Create in legacy table for backwards compatibility
    const { data: newDesignItem, error: itemError } = await supabase
      .from('event_design_items')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: id,
        item_name: custom_name,
        design_start_date: designStartDate.toISOString().split('T')[0],
        design_deadline: designDeadline.toISOString().split('T')[0],
        custom_design_days: designDays,
        assigned_designer_id,
        internal_notes: notes,
        status: 'pending',
        due_date: designDeadline.toISOString().split('T')[0],
        created_by: session.user.id
      })
      .select()
      .single()

    if (itemError) throw itemError

    // Create unified task with ALL required fields
    const taskName = `Design: ${custom_name}`
    const now = new Date()
    const daysUntilDeadline = Math.ceil((designDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Determine priority based on deadline
    let priority = 'medium'
    if (daysUntilDeadline <= 7) priority = 'high'
    if (daysUntilDeadline <= 3) priority = 'urgent'

    const { data: task } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title: taskName,
        description: notes || `Complete ${custom_name} for this event`,

        // CRITICAL: These fields are required for My Tasks and dashboards
        entity_type: 'event',
        entity_id: id,
        assigned_to: assigned_designer_id || null,
        assigned_at: assigned_designer_id ? new Date().toISOString() : null,
        created_by: session.user.id,

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
        migrated_from_id: newDesignItem.id
      })
      .select()
      .single()

    if (task) {
      await supabase
        .from('event_design_items')
        .update({ task_id: task.id })
        .eq('id', newDesignItem.id)
    }

    return NextResponse.json({ designItem: newDesignItem })
  } catch (error: any) {
    log.error({ error }, 'Error creating design item')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
