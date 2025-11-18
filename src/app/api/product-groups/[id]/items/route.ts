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
    const { inventory_item_id, quantity } = body

    if (!inventory_item_id) {
      return NextResponse.json({
        error: 'inventory_item_id is required'
      }, { status: 400 })
    }

    // Fetch the inventory item to check tracking type
    const { data: inventoryItem, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, item_name, tracking_type, total_quantity')
      .eq('id', inventory_item_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (itemError || !inventoryItem) {
      return NextResponse.json({
        error: 'Inventory item not found',
        details: itemError?.message
      }, { status: 404 })
    }

    // Determine quantity to add
    let quantityToAdd = 1  // Default for serial items
    
    if (inventoryItem.tracking_type === 'total_quantity') {
      quantityToAdd = quantity || 1
      
      // Calculate how many units are already allocated to OTHER product groups
      const { data: existingAllocations } = await supabase
        .from('product_group_items')
        .select('quantity')
        .eq('inventory_item_id', inventory_item_id)
        .eq('tenant_id', dataSourceTenantId)
        .neq('product_group_id', groupId)  // Exclude current group
      
      const totalAllocated = existingAllocations?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0
      const availableQuantity = (inventoryItem.total_quantity || 0) - totalAllocated
      
      // Validate quantity doesn't exceed AVAILABLE (not just total)
      if (quantityToAdd > availableQuantity) {
        return NextResponse.json({
          error: `Cannot add ${quantityToAdd} units. Only ${availableQuantity} available (${totalAllocated} already allocated to other groups).`
        }, { status: 400 })
      }
    }

    const linkData = {
      product_group_id: groupId,
      inventory_item_id,
      quantity: quantityToAdd,
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
    console.error('Error adding item to product group:', error)
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
    console.error('Error removing item from product group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
