import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - Dismiss notification
 * Marks notification as dismissed with timestamp and user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id } = params

    const { data, error } = await supabase
      .from('inventory_notifications')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_by: session?.user?.id
      })
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
      console.error('Error dismissing notification:', error)
      return NextResponse.json(
        { error: 'Failed to dismiss notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
