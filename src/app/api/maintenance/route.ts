import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:maintenance')

/**
 * GET - List maintenance history with filters
 * Query params: inventory_item_id, performed_by, maintenance_type, date_from, date_to, sort_by, sort_order, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse filters
    const inventoryItemId = searchParams.get('inventory_item_id')
    const performedBy = searchParams.get('performed_by')
    const maintenanceType = searchParams.get('maintenance_type')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const sortBy = searchParams.get('sort_by') || 'maintenance_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query with relations
    let query = supabase
      .from('maintenance_history')
      .select(`
        *,
        performed_by_user:users!maintenance_history_performed_by_fkey(id, first_name, last_name, email),
        inventory_item:inventory_items!maintenance_history_inventory_item_id_fkey(id, item_name, item_category, serial_number)
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (inventoryItemId) {
      query = query.eq('inventory_item_id', inventoryItemId)
    }

    if (performedBy) {
      query = query.eq('performed_by', performedBy)
    }

    if (maintenanceType) {
      query = query.eq('maintenance_type', maintenanceType)
    }

    if (dateFrom) {
      query = query.gte('maintenance_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('maintenance_date', dateTo)
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
      log.error({ error }, 'Error fetching maintenance history')
      return NextResponse.json(
        { error: 'Failed to fetch maintenance history', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Log completed maintenance
 * Creates maintenance history record and updates inventory item maintenance dates
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()

    // Validation
    if (!body.inventory_item_id) {
      return NextResponse.json({ error: 'inventory_item_id is required' }, { status: 400 })
    }

    if (!body.maintenance_date) {
      return NextResponse.json({ error: 'maintenance_date is required' }, { status: 400 })
    }

    if (!body.notes) {
      return NextResponse.json({ error: 'notes are required' }, { status: 400 })
    }

    // Get the inventory item to calculate next maintenance date
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('maintenance_interval_days, item_category')
      .eq('id', body.inventory_item_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (itemError) {
      return NextResponse.json(
        { error: 'Inventory item not found', details: itemError.message },
        { status: 404 }
      )
    }

    // Calculate next maintenance date if interval is set
    let nextMaintenanceDate = body.next_maintenance_date
    if (!nextMaintenanceDate && item.maintenance_interval_days) {
      const maintenanceDate = new Date(body.maintenance_date)
      maintenanceDate.setDate(maintenanceDate.getDate() + item.maintenance_interval_days)
      nextMaintenanceDate = maintenanceDate.toISOString().split('T')[0]
    }

    // Insert maintenance history
    const { data, error } = await supabase
      .from('maintenance_history')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId,
        next_maintenance_date: nextMaintenanceDate
      })
      .select(`
        *,
        performed_by_user:users!maintenance_history_performed_by_fkey(id, first_name, last_name, email),
        inventory_item:inventory_items!maintenance_history_inventory_item_id_fkey(id, item_name, item_category, serial_number)
      `)
      .single()

    if (error) {
      log.error({ error }, 'Error creating maintenance history')
      return NextResponse.json(
        { error: 'Failed to create maintenance history', details: error.message },
        { status: 500 }
      )
    }

    // Note: inventory_items is automatically updated via trigger (update_inventory_maintenance_dates)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
