import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/events/[id]/inventory - Get all inventory assigned to an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const eventId = params.id

    // Verify event exists and belongs to tenant
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, start_date')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({
        error: 'Event not found'
      }, { status: 404 })
    }

    // Fetch inventory assigned to this event
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .order('item_name', { ascending: true })

    if (inventoryError) {
      return NextResponse.json({
        error: 'Failed to fetch event inventory',
        details: inventoryError.message
      }, { status: 500 })
    }

    // Enrich with user/location names
    if (inventory && inventory.length > 0) {
      const userIds = [...new Set(
        inventory.filter(item => item.assigned_to_type === 'user' && item.assigned_to_id)
          .map(item => item.assigned_to_id)
      )]
      const locationIds = [...new Set(
        inventory.filter(item => item.assigned_to_type === 'physical_address' && item.assigned_to_id)
          .map(item => item.assigned_to_id)
      )]

      // Fetch users
      const usersMap = new Map()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)

        users?.forEach(user => {
          usersMap.set(user.id, `${user.first_name} ${user.last_name}`)
        })
      }

      // Fetch locations
      const locationsMap = new Map()
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from('physical_addresses')
          .select('id, location_name')
          .in('id', locationIds)

        locations?.forEach(location => {
          locationsMap.set(location.id, location.location_name)
        })
      }

      // Add assignment names
      inventory.forEach(item => {
        if (item.assigned_to_type === 'user' && item.assigned_to_id) {
          item.assigned_to_name = usersMap.get(item.assigned_to_id) || 'Unknown User'
        } else if (item.assigned_to_type === 'physical_address' && item.assigned_to_id) {
          item.assigned_to_name = locationsMap.get(item.assigned_to_id) || 'Unknown Location'
        }
      })
    }

    // Group by staff member
    const inventoryByStaff = new Map()
    inventory?.forEach(item => {
      if (item.assigned_to_type === 'user' && item.assigned_to_id) {
        const staffId = item.assigned_to_id
        if (!inventoryByStaff.has(staffId)) {
          inventoryByStaff.set(staffId, {
            staff_id: staffId,
            staff_name: item.assigned_to_name,
            items: []
          })
        }
        inventoryByStaff.get(staffId).items.push(item)
      }
    })

    return NextResponse.json({
      event,
      inventory: inventory || [],
      total_items: inventory?.length || 0,
      by_staff: Array.from(inventoryByStaff.values()),
      ready_count: inventory?.filter(item =>
        item.assignment_type === 'event_checkout' && item.assigned_to_type === 'user'
      ).length || 0,
      needs_prep_count: inventory?.filter(item =>
        item.assignment_type !== 'event_checkout' || item.assigned_to_type !== 'user'
      ).length || 0
    })
  } catch (error) {
    console.error('Event inventory error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
