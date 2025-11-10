import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/product-groups/[id] - Fetch single product group with items
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const groupId = params.id

    const { data, error } = await supabase
      .from('product_groups')
      .select(`
        *,
        product_group_items (
          id,
          inventory_item_id,
          date_added,
          inventory_items (
            id,
            item_name,
            item_category,
            tracking_type,
            serial_number,
            total_quantity
          )
        )
      `)
      .eq('id', groupId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch product group',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/product-groups/[id] - Update product group (cascades to items)
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
    const groupId = params.id
    const body = await request.json()

    // Validate that assigned_to_id is provided if being updated
    if (body.assigned_to_id !== undefined && !body.assigned_to_id) {
      return NextResponse.json({
        error: 'Product groups must be assigned to a user or physical address',
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('product_groups')
      .update(body)
      .eq('id', groupId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update product group',
        details: error.message
      }, { status: 500 })
    }

    // The database trigger will automatically cascade the assignment change to all items
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/product-groups/[id] - Delete product group
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
    const groupId = params.id

    const { error } = await supabase
      .from('product_groups')
      .delete()
      .eq('id', groupId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to delete product group',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
