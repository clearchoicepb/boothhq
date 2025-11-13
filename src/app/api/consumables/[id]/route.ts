import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - Get single consumable inventory by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { data, error } = await supabase
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
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Consumable not found' }, { status: 404 })
      }
      console.error('Error fetching consumable:', error)
      return NextResponse.json(
        { error: 'Failed to fetch consumable', details: error.message },
        { status: 500 }
      )
    }

    // Enrich with status
    const lowStockThreshold = data.category?.low_stock_threshold || 0
    const consumptionPerEvent = data.category?.estimated_consumption_per_event || 0

    return NextResponse.json({
      ...data,
      low_stock_threshold: lowStockThreshold,
      estimated_consumption_per_event: consumptionPerEvent,
      is_low_stock: data.current_quantity <= lowStockThreshold,
      is_out_of_stock: data.current_quantity === 0,
      estimated_events_remaining: consumptionPerEvent > 0
        ? Math.floor(data.current_quantity / consumptionPerEvent)
        : Infinity
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update consumable inventory
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params
    const body = await request.json()

    // Validate quantity if provided
    if (body.current_quantity !== undefined && body.current_quantity < 0) {
      return NextResponse.json(
        { error: 'current_quantity must be >= 0' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('consumable_inventory')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Consumable not found' }, { status: 404 })
      }
      console.error('Error updating consumable:', error)
      return NextResponse.json(
        { error: 'Failed to update consumable', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Delete consumable inventory
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { error } = await supabase
      .from('consumable_inventory')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting consumable:', error)
      return NextResponse.json(
        { error: 'Failed to delete consumable', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
