import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/inventory-items/bulk-prep-status - Bulk update prep status for multiple items
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      item_ids,
      prep_status,
      shipping_carrier,
      shipping_tracking_number,
      shipping_expected_delivery,
      checkin_condition,
      checkin_notes
    } = body

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({
        error: 'item_ids array is required'
      }, { status: 400 })
    }

    // Validate prep_status
    const validStatuses = [
      'unassigned',
      'needs_prep',
      'ready_for_pickup',
      'in_transit',
      'delivered_to_staff',
      'pending_checkin',
      'checked_in'
    ]

    if (!prep_status || !validStatuses.includes(prep_status)) {
      return NextResponse.json({
        error: 'Invalid prep_status. Must be one of: ' + validStatuses.join(', ')
      }, { status: 400 })
    }

    // Build update data based on the status transition
    const updateData: any = {
      prep_status,
      updated_at: new Date().toISOString()
    }

    // Set timestamps and user based on status
    switch (prep_status) {
      case 'ready_for_pickup':
        updateData.prep_completed_at = new Date().toISOString()
        updateData.prep_completed_by = session.user.id
        break

      case 'in_transit':
        updateData.prep_completed_at = new Date().toISOString()
        updateData.prep_completed_by = session.user.id
        updateData.shipped_at = new Date().toISOString()
        updateData.shipped_by = session.user.id
        if (shipping_carrier) updateData.shipping_carrier = shipping_carrier
        if (shipping_tracking_number) updateData.shipping_tracking_number = shipping_tracking_number
        if (shipping_expected_delivery) updateData.shipping_expected_delivery = shipping_expected_delivery
        break

      case 'delivered_to_staff':
        updateData.delivered_at = new Date().toISOString()
        updateData.delivered_by = session.user.id
        break

      case 'checked_in':
        updateData.checked_in_at = new Date().toISOString()
        updateData.checked_in_by = session.user.id
        if (checkin_condition) updateData.checkin_condition = checkin_condition
        if (checkin_notes) updateData.checkin_notes = checkin_notes
        // Reset event assignment after check-in
        updateData.event_id = null
        updateData.assignment_type = 'warehouse'
        break
    }

    // Update all items
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .in('id', item_ids)
      .eq('tenant_id', dataSourceTenantId)
      .select()

    if (error) {
      return NextResponse.json({
        error: 'Failed to bulk update prep status',
        details: error.message
      }, { status: 500 })
    }

    // Log to item history for each item
    const historyEntries = item_ids.map(itemId => ({
      tenant_id: dataSourceTenantId,
      inventory_item_id: itemId,
      action: `bulk_prep_status_changed_to_${prep_status}`,
      changed_by: session.user.id,
      changes: {
        prep_status: { new: prep_status },
        bulk_action: true,
        ...(shipping_carrier && { shipping_carrier }),
        ...(shipping_tracking_number && { shipping_tracking_number }),
        ...(checkin_condition && { checkin_condition }),
        ...(checkin_notes && { checkin_notes })
      },
      created_at: new Date().toISOString()
    }))

    await supabase.from('inventory_item_history').insert(historyEntries)

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      items: data
    })
  } catch (error) {
    console.error('Error bulk updating prep status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
