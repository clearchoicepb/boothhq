import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/product-groups/[id]/items - Add item to product group
export async function POST(
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
    const { inventory_item_id } = body

    if (!inventory_item_id) {
      return NextResponse.json({
        error: 'inventory_item_id is required'
      }, { status: 400 })
    }

    const linkData = {
      product_group_id: groupId,
      inventory_item_id,
      tenant_id: dataSourceTenantId
    }

    const { data, error } = await supabase
      .from('product_group_items')
      .insert(linkData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to add item to product group',
        details: error.message,
      }, { status: 500 })
    }

    // The database trigger will automatically assign the item to the group's location
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/product-groups/[id]/items/[itemId] - Remove item from product group
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string; itemId: string }> }
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
    const { searchParams } = new URL(request.url)
    const inventoryItemId = searchParams.get('inventory_item_id')

    if (!inventoryItemId) {
      return NextResponse.json({
        error: 'inventory_item_id query parameter is required'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('product_group_items')
      .delete()
      .eq('product_group_id', groupId)
      .eq('inventory_item_id', inventoryItemId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to remove item from product group',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
