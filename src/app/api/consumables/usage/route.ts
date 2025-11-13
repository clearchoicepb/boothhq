import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - Get consumable usage log with filters
 * Query params: consumable_id, event_id, usage_type, date_from, date_to, sort_by, sort_order, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse filters
    const consumableId = searchParams.get('consumable_id')
    const eventId = searchParams.get('event_id')
    const usageType = searchParams.get('usage_type')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const sortBy = searchParams.get('sort_by') || 'usage_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query with relations
    let query = supabase
      .from('consumable_usage_log')
      .select(`
        *,
        consumable:consumable_inventory!consumable_usage_log_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name, color)
        ),
        event:events!consumable_usage_log_event_id_fkey(id, event_name, event_date),
        logged_by_user:users!consumable_usage_log_logged_by_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (consumableId) {
      query = query.eq('consumable_id', consumableId)
    }

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (usageType) {
      query = query.eq('usage_type', usageType)
    }

    if (dateFrom) {
      query = query.gte('usage_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('usage_date', dateTo)
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
      console.error('Error fetching consumable usage log:', error)
      return NextResponse.json(
        { error: 'Failed to fetch consumable usage log', details: error.message },
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
 * POST - Log consumable usage
 * Automatically deducts from consumable inventory via database trigger
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()

    // Validation
    if (!body.consumable_id) {
      return NextResponse.json({ error: 'consumable_id is required' }, { status: 400 })
    }

    if (!body.quantity_used || body.quantity_used <= 0) {
      return NextResponse.json(
        { error: 'quantity_used is required and must be > 0' },
        { status: 400 }
      )
    }

    if (!body.usage_date) {
      return NextResponse.json({ error: 'usage_date is required' }, { status: 400 })
    }

    // Check if consumable exists and has enough quantity
    const { data: consumable, error: consumableError } = await supabase
      .from('consumable_inventory')
      .select('current_quantity')
      .eq('id', body.consumable_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (consumableError || !consumable) {
      return NextResponse.json({ error: 'Consumable not found' }, { status: 404 })
    }

    if (consumable.current_quantity < body.quantity_used) {
      return NextResponse.json(
        {
          error: 'Insufficient quantity',
          details: `Only ${consumable.current_quantity} available, requested ${body.quantity_used}`
        },
        { status: 400 }
      )
    }

    // Log usage (trigger will automatically deduct from inventory)
    const { data, error } = await supabase
      .from('consumable_usage_log')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId,
        logged_by: body.logged_by || session?.user?.id,
        usage_type: body.usage_type || 'manual'
      })
      .select(`
        *,
        consumable:consumable_inventory!consumable_usage_log_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name, color)
        ),
        event:events!consumable_usage_log_event_id_fkey(id, event_name, event_date),
        logged_by_user:users!consumable_usage_log_logged_by_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (error) {
      console.error('Error logging consumable usage:', error)
      return NextResponse.json(
        { error: 'Failed to log consumable usage', details: error.message },
        { status: 500 }
      )
    }

    // Note: consumable_inventory.current_quantity is automatically updated via trigger

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
