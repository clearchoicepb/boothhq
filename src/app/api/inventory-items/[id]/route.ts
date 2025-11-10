import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inventory-items/[id] - Fetch single inventory item
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const itemId = params.id

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch inventory item',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/inventory-items/[id] - Update inventory item
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const itemId = params.id
    const body = await request.json()

    // Validate tracking type requirements if being updated
    if (body.tracking_type === 'serial_number' && !body.serial_number) {
      return NextResponse.json({
        error: 'Serial number is required when tracking type is serial_number',
      }, { status: 400 })
    }

    if (body.tracking_type === 'total_quantity' && (!body.total_quantity || body.total_quantity <= 0)) {
      return NextResponse.json({
        error: 'Total quantity must be greater than 0 when tracking type is total_quantity',
      }, { status: 400 })
    }

    // Check if item is in a product group - if so, prevent changing assignment
    const { data: groupItem } = await supabase
      .from('product_group_items')
      .select('product_group_id')
      .eq('inventory_item_id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (groupItem && (body.assigned_to_type !== undefined || body.assigned_to_id !== undefined)) {
      return NextResponse.json({
        error: 'Cannot change assignment of items in product groups. Remove from group first or change the product groups assignment.',
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .update(body)
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update inventory item',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/inventory-items/[id] - Delete inventory item
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const itemId = params.id

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to delete inventory item',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
