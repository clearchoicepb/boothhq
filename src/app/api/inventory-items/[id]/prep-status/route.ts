import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-items')

// PUT /api/inventory-items/[id]/prep-status - Update prep status for an inventory item
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
    const {
      prep_status,
      shipping_carrier,
      shipping_tracking_number,
      shipping_expected_delivery,
      checkin_condition,
      checkin_notes
    } = body

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
        updateData.prep_completed_at = updateData.prep_completed_at || new Date().toISOString()
        updateData.prep_completed_by = updateData.prep_completed_by || session.user.id
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

    // Update the item
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update prep status',
        details: error.message
      }, { status: 500 })
    }

    // Log to item history
    await supabase.from('inventory_item_history').insert({
      tenant_id: dataSourceTenantId,
      inventory_item_id: itemId,
      action: `prep_status_changed_to_${prep_status}`,
      changed_by: session.user.id,
      changes: {
        prep_status: { old: body.old_prep_status, new: prep_status },
        ...(shipping_carrier && { shipping_carrier }),
        ...(shipping_tracking_number && { shipping_tracking_number }),
        ...(checkin_condition && { checkin_condition }),
        ...(checkin_notes && { checkin_notes })
      },
      created_at: new Date().toISOString()
    })

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error updating prep status')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
