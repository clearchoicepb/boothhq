import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - List inventory notifications with filters
 * Query params: notification_type, status, inventory_item_id, consumable_id, due_date_from, due_date_to, sort_by, sort_order, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse filters
    const notificationType = searchParams.get('notification_type')
    const status = searchParams.get('status')
    const inventoryItemId = searchParams.get('inventory_item_id')
    const consumableId = searchParams.get('consumable_id')
    const dueDateFrom = searchParams.get('due_date_from')
    const dueDateTo = searchParams.get('due_date_to')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query with relations
    let query = supabase
      .from('inventory_notifications')
      .select(`
        *,
        inventory_item:inventory_items!inventory_notifications_inventory_item_id_fkey(id, item_name, item_category, serial_number),
        consumable:consumable_inventory!inventory_notifications_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name)
        ),
        dismissed_by_user:users!inventory_notifications_dismissed_by_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (notificationType) {
      query = query.eq('notification_type', notificationType)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (inventoryItemId) {
      query = query.eq('inventory_item_id', inventoryItemId)
    }

    if (consumableId) {
      query = query.eq('consumable_id', consumableId)
    }

    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom)
    }

    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching inventory notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory notifications', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Create new inventory notification
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const body = await request.json()

    // Validation
    if (!body.notification_type) {
      return NextResponse.json({ error: 'notification_type is required' }, { status: 400 })
    }

    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    if (!body.message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Must have either inventory_item_id or consumable_id
    if (!body.inventory_item_id && !body.consumable_id) {
      return NextResponse.json(
        { error: 'Either inventory_item_id or consumable_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('inventory_notifications')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select(`
        *,
        inventory_item:inventory_items!inventory_notifications_inventory_item_id_fkey(id, item_name, item_category, serial_number),
        consumable:consumable_inventory!inventory_notifications_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name)
        )
      `)
      .single()

    if (error) {
      console.error('Error creating inventory notification:', error)
      return NextResponse.json(
        { error: 'Failed to create inventory notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
