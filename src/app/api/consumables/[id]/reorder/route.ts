import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - Record consumable reorder
 * Updates reorder tracking fields and adds to current quantity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params
    const body = await request.json()

    // Validation
    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity is required and must be > 0' },
        { status: 400 }
      )
    }

    if (!body.cost || body.cost < 0) {
      return NextResponse.json(
        { error: 'cost is required and must be >= 0' },
        { status: 400 }
      )
    }

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // Get current consumable
    const { data: current, error: fetchError } = await supabase
      .from('consumable_inventory')
      .select('current_quantity')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Consumable not found' }, { status: 404 })
    }

    // Update consumable with reorder info and add to quantity
    const { data, error } = await supabase
      .from('consumable_inventory')
      .update({
        current_quantity: current.current_quantity + body.quantity,
        last_reorder_date: body.date,
        last_reorder_quantity: body.quantity,
        last_reorder_cost: body.cost
      })
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
      console.error('Error recording reorder:', error)
      return NextResponse.json(
        { error: 'Failed to record reorder', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
