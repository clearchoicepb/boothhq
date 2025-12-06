import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:consumables')

/**
 * GET - List consumable inventory with enhanced status info
 * Query params: category_id, low_stock_only, sort_by, sort_order
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse filters
    const categoryId = searchParams.get('category_id')
    const lowStockOnly = searchParams.get('low_stock_only') === 'true'
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // Build query with category relation
    let query = supabase
      .from('consumable_inventory')
      .select(`
        *,
        category:equipment_categories!consumable_inventory_category_id_fkey(
          id,
          name,
          description,
          color,
          estimated_consumption_per_event,
          unit_of_measure,
          low_stock_threshold
        )
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching consumables')
      return NextResponse.json(
        { error: 'Failed to fetch consumables', details: error.message },
        { status: 500 }
      )
    }

    // Enrich data with stock status and events remaining
    const enrichedData = (data || []).map(item => {
      const lowStockThreshold = item.category?.low_stock_threshold || 0
      const consumptionPerEvent = item.category?.estimated_consumption_per_event || 0

      const isLowStock = item.current_quantity <= lowStockThreshold
      const isOutOfStock = item.current_quantity === 0
      const eventsRemaining = consumptionPerEvent > 0
        ? Math.floor(item.current_quantity / consumptionPerEvent)
        : Infinity

      return {
        ...item,
        low_stock_threshold: lowStockThreshold,
        estimated_consumption_per_event: consumptionPerEvent,
        is_low_stock: isLowStock,
        is_out_of_stock: isOutOfStock,
        estimated_events_remaining: eventsRemaining
      }
    })

    // Apply low stock filter if requested
    const finalData = lowStockOnly
      ? enrichedData.filter(item => item.is_low_stock)
      : enrichedData

    return NextResponse.json(finalData)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Create new consumable inventory record
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const body = await request.json()

    // Validation
    if (!body.category_id) {
      return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
    }

    if (body.current_quantity === undefined || body.current_quantity < 0) {
      return NextResponse.json({ error: 'current_quantity is required and must be >= 0' }, { status: 400 })
    }

    if (!body.unit_of_measure) {
      return NextResponse.json({ error: 'unit_of_measure is required' }, { status: 400 })
    }

    // Check if consumable inventory already exists for this category
    const { data: existing } = await supabase
      .from('consumable_inventory')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('category_id', body.category_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Consumable inventory already exists for this category' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('consumable_inventory')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select(`
        *,
        category:equipment_categories!consumable_inventory_category_id_fkey(
          id,
          name,
          description,
          color,
          estimated_consumption_per_event,
          unit_of_measure,
          low_stock_threshold
        )
      `)
      .single()

    if (error) {
      log.error({ error }, 'Error creating consumable inventory')
      return NextResponse.json(
        { error: 'Failed to create consumable inventory', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
