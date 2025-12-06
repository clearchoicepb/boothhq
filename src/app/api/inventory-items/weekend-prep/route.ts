import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-items')

// GET /api/inventory-items/weekend-prep - Get weekend prep dashboard data
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Allow custom date range, default to upcoming weekend (Friday-Sunday)
    const dateParam = searchParams.get('date') || new Date().toISOString()
    const targetDate = new Date(dateParam)

    // Find the upcoming Friday-Sunday window
    const today = new Date()
    const dayOfWeek = today.getDay()

    // Calculate days until Friday (or use today if it's already Friday or later in the week)
    let daysUntilFriday = 5 - dayOfWeek
    if (daysUntilFriday < 0) daysUntilFriday = 0 // If it's already past Friday, use 0

    const weekendStart = addDays(today, daysUntilFriday) // Friday
    const weekendEnd = addDays(weekendStart, 2) // Sunday

    weekendStart.setHours(0, 0, 0, 0)
    weekendEnd.setHours(23, 59, 59, 999)

    // Fetch events happening this weekend
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_date, status')
      .eq('tenant_id', dataSourceTenantId)
      .gte('start_date', weekendStart.toISOString())
      .lte('start_date', weekendEnd.toISOString())
      .order('start_date', { ascending: true })

    if (eventsError) {
      log.error({ eventsError }, 'Error fetching events')
      return NextResponse.json({
        error: 'Failed to fetch events',
        details: eventsError.message
      }, { status: 500 })
    }

    // Fetch inventory assigned to these events
    const eventIds = events?.map(e => e.id) || []

    let eventInventory: any[] = []
    if (eventIds.length > 0) {
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('tenant_id', dataSourceTenantId)
        .in('event_id', eventIds)

      if (inventoryError) {
        log.error({ inventoryError }, 'Error fetching event inventory')
      } else {
        eventInventory = inventory || []
      }
    }

    // Fetch items due back this week (for Monday/Tuesday returns)
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }) // Sunday

    const { data: dueback, error: duebackError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .not('expected_return_date', 'is', null)
      .gte('expected_return_date', weekStart.toISOString().split('T')[0])
      .lte('expected_return_date', weekEnd.toISOString().split('T')[0])
      .order('expected_return_date', { ascending: true })

    if (duebackError) {
      log.error({ duebackError }, 'Error fetching due back items')
    }

    // Enrich inventory with user/location/group names
    const allInventory = [...eventInventory, ...(dueback || [])]

    if (allInventory.length > 0) {
      const userIds = [...new Set(
        allInventory.filter(item => item.assigned_to_type === 'user' && item.assigned_to_id)
          .map(item => item.assigned_to_id)
      )]
      const locationIds = [...new Set(
        allInventory.filter(item => item.assigned_to_type === 'physical_address' && item.assigned_to_id)
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
      allInventory.forEach(item => {
        if (item.assigned_to_type === 'user' && item.assigned_to_id) {
          item.assigned_to_name = usersMap.get(item.assigned_to_id) || 'Unknown User'
        } else if (item.assigned_to_type === 'physical_address' && item.assigned_to_id) {
          item.assigned_to_name = locationsMap.get(item.assigned_to_id) || 'Unknown Location'
        }
      })
    }

    // Group inventory by event
    const inventoryByEvent = new Map()
    eventInventory.forEach(item => {
      if (!inventoryByEvent.has(item.event_id)) {
        inventoryByEvent.set(item.event_id, [])
      }
      inventoryByEvent.get(item.event_id).push(item)
    })

    // Build event summaries with prep status
    const eventSummaries = events?.map(event => {
      const inventory = inventoryByEvent.get(event.id) || []

      // Calculate event-level status based on "worst" item status
      // Status priority (worst to best): no gear -> needs_prep -> ready_for_pickup/in_transit -> delivered_to_staff
      let eventStatus = 'delivered_to_staff' // Best case

      if (inventory.length === 0) {
        eventStatus = 'needs_gear_assigned'
      } else {
        const statusPriority: Record<string, number> = {
          'needs_gear_assigned': 1,
          'needs_prep': 2,
          'ready_for_pickup': 3,
          'in_transit': 3,
          'delivered_to_staff': 4
        }

        let worstPriority = 4
        for (const item of inventory) {
          const itemStatus = item.prep_status || 'needs_prep'
          const priority = statusPriority[itemStatus] || 2
          if (priority < worstPriority) {
            worstPriority = priority
            eventStatus = itemStatus
          }
        }
      }

      // Count items by status
      const statusCounts = {
        needs_prep: inventory.filter((item: any) => item.prep_status === 'needs_prep').length,
        ready_for_pickup: inventory.filter((item: any) => item.prep_status === 'ready_for_pickup').length,
        in_transit: inventory.filter((item: any) => item.prep_status === 'in_transit').length,
        delivered_to_staff: inventory.filter((item: any) => item.prep_status === 'delivered_to_staff').length
      }

      return {
        ...event,
        inventory_count: inventory.length,
        inventory,
        event_status: eventStatus,
        status_counts: statusCounts,
        // Legacy fields for backward compatibility
        all_ready: eventStatus === 'delivered_to_staff',
        needs_prep: statusCounts.needs_prep
      }
    }) || []

    // Categorize items due back
    const duebackItems = dueback || []
    const returnedItems = duebackItems.filter((item: any) =>
      item.assignment_type === 'warehouse' || !item.assigned_to_id
    )
    const overdueItems = duebackItems.filter((item: any) => {
      if (!item.expected_return_date) return false
      const returnDate = new Date(item.expected_return_date)
      return returnDate < today && item.assignment_type !== 'warehouse'
    })
    const expectedTodayItems = duebackItems.filter((item: any) => {
      if (!item.expected_return_date) return false
      const returnDate = new Date(item.expected_return_date)
      return returnDate.toDateString() === today.toDateString() &&
             item.assignment_type !== 'warehouse'
    })

    return NextResponse.json({
      weekend_start: weekendStart.toISOString(),
      weekend_end: weekendEnd.toISOString(),
      events: eventSummaries,
      total_events: eventSummaries.length,
      total_equipment_out: eventInventory.length,
      returns: {
        total: duebackItems.length,
        returned: returnedItems.length,
        expected_today: expectedTodayItems.length,
        overdue: overdueItems.length,
        items: duebackItems
      }
    })
  } catch (error) {
    log.error({ error }, 'Weekend prep error')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
