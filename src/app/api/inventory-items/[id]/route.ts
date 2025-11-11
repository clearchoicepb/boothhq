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

    // Fetch assignment name if assigned
    if (data && data.assigned_to_type && data.assigned_to_id) {
      if (data.assigned_to_type === 'user') {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', data.assigned_to_id)
          .single()

        if (user) {
          data.assigned_to_name = `${user.first_name} ${user.last_name}`
        }
      } else if (data.assigned_to_type === 'physical_address') {
        const { data: location } = await supabase
          .from('physical_addresses')
          .select('location_name')
          .eq('id', data.assigned_to_id)
          .single()

        if (location) {
          data.assigned_to_name = location.location_name
        }
      } else if (data.assigned_to_type === 'product_group') {
        const { data: group } = await supabase
          .from('product_groups')
          .select('group_name')
          .eq('id', data.assigned_to_id)
          .single()

        if (group) {
          data.assigned_to_name = group.group_name
        }
      }
    }

    // Fetch assignment history summary (most recent entry)
    if (data) {
      const { data: historyData } = await supabase
        .from('inventory_assignment_history')
        .select('assigned_from_name, assigned_to_name, changed_at')
        .eq('inventory_item_id', itemId)
        .eq('tenant_id', dataSourceTenantId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (historyData) {
        data.last_assigned_to = historyData.assigned_from_name
        data.last_changed_at = historyData.changed_at
      }
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

    // Remove computed fields that aren't in the database
    // Also extract product_group_id if provided (for managing group membership separately)
    const { assigned_to_name, product_group_id, ...updateData } = body

    // Validate tracking type requirements if being updated
    if (updateData.tracking_type === 'serial_number' && !updateData.serial_number) {
      return NextResponse.json({
        error: 'Serial number is required when tracking type is serial_number',
      }, { status: 400 })
    }

    if (updateData.tracking_type === 'total_quantity' && (!updateData.total_quantity || updateData.total_quantity <= 0)) {
      return NextResponse.json({
        error: 'Total quantity must be greater than 0 when tracking type is total_quantity',
      }, { status: 400 })
    }

    // Get current product group assignment if any
    const { data: currentGroupItem } = await supabase
      .from('product_group_items')
      .select('product_group_id')
      .eq('inventory_item_id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .maybeSingle()

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
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

    // Handle product group junction table updates
    // Note: product_group_id is managed separately from assigned_to_* fields
    // Items inherit the group's assignment through database triggers
    if (product_group_id !== undefined) {
      const newGroupId = product_group_id // null means remove from group
      const oldGroupId = currentGroupItem?.product_group_id || null

      // If group membership changed, update junction table
      if (newGroupId !== oldGroupId) {
        // Remove old junction entry if exists
        if (oldGroupId) {
          const { error: deleteError } = await supabase
            .from('product_group_items')
            .delete()
            .eq('product_group_id', oldGroupId)
            .eq('inventory_item_id', itemId)
            .eq('tenant_id', dataSourceTenantId)

          if (deleteError) {
            console.error('Failed to delete old product group junction:', deleteError)
            return NextResponse.json({
              error: 'Failed to remove item from old product group',
              details: deleteError.message
            }, { status: 500 })
          }
        }

        // Add new junction entry if assigning to a group
        if (newGroupId) {
          // Verify the product group exists first
          const { data: groupExists, error: groupCheckError } = await supabase
            .from('product_groups')
            .select('id')
            .eq('id', newGroupId)
            .eq('tenant_id', dataSourceTenantId)
            .maybeSingle()

          if (groupCheckError) {
            console.error('Failed to verify product group:', groupCheckError)
            return NextResponse.json({
              error: 'Failed to verify product group exists',
              details: groupCheckError.message
            }, { status: 500 })
          }

          if (!groupExists) {
            return NextResponse.json({
              error: 'Product group not found',
              details: `Product group ${newGroupId} does not exist or does not belong to your tenant`
            }, { status: 404 })
          }

          const { error: insertError } = await supabase
            .from('product_group_items')
            .insert({
              product_group_id: newGroupId,
              inventory_item_id: itemId,
              tenant_id: dataSourceTenantId
            })

          if (insertError) {
            console.error('Failed to insert product group junction:', insertError)
            return NextResponse.json({
              error: 'Failed to add item to product group',
              details: insertError.message,
              code: insertError.code
            }, { status: 500 })
          }
        }
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PUT /api/inventory-items/[id] error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
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
