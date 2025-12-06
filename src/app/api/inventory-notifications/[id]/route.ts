import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-notifications')

/**
 * GET - Get single notification by ID
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
      .from('inventory_notifications')
      .select(`
        *,
        inventory_item:inventory_items!inventory_notifications_inventory_item_id_fkey(id, item_name, item_category, serial_number),
        consumable:consumable_inventory!inventory_notifications_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name)
        ),
        dismissed_by_user:users!inventory_notifications_dismissed_by_fkey(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      log.error({ error }, 'Error fetching notification')
      return NextResponse.json(
        { error: 'Failed to fetch notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update notification
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

    const { data, error } = await supabase
      .from('inventory_notifications')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        inventory_item:inventory_items!inventory_notifications_inventory_item_id_fkey(id, item_name, item_category, serial_number),
        consumable:consumable_inventory!inventory_notifications_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name)
        ),
        dismissed_by_user:users!inventory_notifications_dismissed_by_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      log.error({ error }, 'Error updating notification')
      return NextResponse.json(
        { error: 'Failed to update notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Delete notification
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
      .from('inventory_notifications')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting notification')
      return NextResponse.json(
        { error: 'Failed to delete notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
