import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'
import { createDesignItemForEvent, createDesignItemsForProduct } from '@/lib/design-helpers'

// GET - Fetch all design items for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: designItems, error } = await supabase
      .from('event_design_items')
      .select(`
        *,
        design_item_type:design_item_types(id, name, type),
        assigned_designer:users!event_design_items_assigned_designer_id_fkey(id, name, email),
        approved_by_user:users!event_design_items_approved_by_fkey(id, name, email)
      `)
      .eq('event_id', id)
      .eq('tenant_id', session.user.tenantId)
      .order('design_deadline', { ascending: true })

    if (error) throw error

    return NextResponse.json({ designItems: designItems || [] })
  } catch (error: any) {
    console.error('Error fetching design items:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a design item for an event
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // If product_id is provided, create design item from product
    if (product_id) {
      designItem = await createDesignItemsForProduct({
        eventId: id,
        eventDate: event_date,
        productId: product_id,
        tenantId: session.user.tenantId
      })

      // Update assigned designer if provided
      if (assigned_designer_id && designItem) {
        await supabase
          .from('event_design_items')
          .update({ assigned_designer_id, internal_notes: notes })
          .eq('id', designItem.id)
      }

      return NextResponse.json({ designItem })
    }

    // If using a template type
    if (design_item_type_id) {
      designItem = await createDesignItemForEvent({
        eventId: id,
        eventDate: event_date,
        designTypeId: design_item_type_id,
        customDesignDays: custom_design_days,
        tenantId: session.user.tenantId
      })

      // Update assigned designer if provided
      if (assigned_designer_id && designItem) {
        await supabase
          .from('event_design_items')
          .update({ assigned_designer_id, internal_notes: notes })
          .eq('id', designItem.id)
      }

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

    const { data: newDesignItem, error: itemError } = await supabase
      .from('event_design_items')
      .insert({
        tenant_id: session.user.tenantId,
        event_id: id,
        item_name: custom_name,
        design_start_date: designStartDate.toISOString().split('T')[0],
        design_deadline: designDeadline.toISOString().split('T')[0],
        custom_design_days: designDays,
        assigned_designer_id,
        internal_notes: notes,
        status: 'pending',
        due_date: designDeadline.toISOString().split('T')[0]
      })
      .select()
      .single()

    if (itemError) throw itemError

    // Create task
    const taskName = `Design: ${custom_name}`
    const now = new Date()
    const daysUntilDeadline = Math.ceil((designDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const { data: task } = await supabase
      .from('tasks')
      .insert({
        tenant_id: session.user.tenantId,
        event_id: id,
        title: taskName,
        description: notes || `Complete ${custom_name} for this event`,
        due_date: designDeadline.toISOString().split('T')[0],
        assigned_to: assigned_designer_id,
        priority: daysUntilDeadline <= 7 ? 'high' : 'medium',
        status: 'pending',
        task_type: 'design'
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
    console.error('Error creating design item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
