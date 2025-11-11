import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inventory-items/availability - Check equipment availability for date range
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const category = searchParams.get('category')
    const itemIds = searchParams.get('item_ids')?.split(',').filter(Boolean)

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      )
    }

    // Build base query for all inventory items
    let query = supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('item_name', { ascending: true })

    // Apply filters if provided
    if (category) {
      query = query.eq('item_category', category)
    }

    if (itemIds && itemIds.length > 0) {
      query = query.in('id', itemIds)
    }

    const { data: items, error } = await query

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch inventory items',
        details: error.message,
      }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        available: [],
        unavailable: [],
        summary: {
          total: 0,
          available: 0,
          unavailable: 0
        }
      })
    }

    // Fetch related names for assignments
    const userIds = [...new Set(
      items.filter(item => item.assigned_to_type === 'user' && item.assigned_to_id)
        .map(item => item.assigned_to_id)
    )]
    const locationIds = [...new Set(
      items.filter(item => item.assigned_to_type === 'physical_address' && item.assigned_to_id)
        .map(item => item.assigned_to_id)
    )]
    const groupIds = [...new Set(
      items.filter(item => item.assigned_to_type === 'product_group' && item.assigned_to_id)
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

    // Fetch physical addresses
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

    // Fetch product groups
    const groupsMap = new Map()
    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from('product_groups')
        .select('id, group_name')
        .in('id', groupIds)

      groups?.forEach(group => {
        groupsMap.set(group.id, group.group_name)
      })
    }

    // Fetch events that might be linked to these items
    const eventIds = [...new Set(items.filter(item => item.event_id).map(item => item.event_id))]
    const eventsMap = new Map()
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, event_name, event_date')
        .in('id', eventIds)

      events?.forEach(event => {
        eventsMap.set(event.id, event)
      })
    }

    // Categorize items as available or unavailable
    const available: any[] = []
    const unavailable: any[] = []

    const requestStart = new Date(startDate)
    const requestEnd = new Date(endDate)

    items.forEach(item => {
      // Add assignment name
      if (item.assigned_to_type && item.assigned_to_id) {
        if (item.assigned_to_type === 'user') {
          item.assigned_to_name = usersMap.get(item.assigned_to_id) || 'Unknown User'
        } else if (item.assigned_to_type === 'physical_address') {
          item.assigned_to_name = locationsMap.get(item.assigned_to_id) || 'Unknown Location'
        } else if (item.assigned_to_type === 'product_group') {
          item.assigned_to_name = groupsMap.get(item.assigned_to_id) || 'Unknown Group'
        }
      }

      // Add event info if linked
      if (item.event_id) {
        const event = eventsMap.get(item.event_id)
        if (event) {
          item.event_name = event.event_name
          item.event_date = event.event_date
        }
      }

      // Determine availability
      let isAvailable = true
      let unavailableReason = ''

      // Rule 1: Long-term staff assignments are never available
      if (item.assignment_type === 'long_term_staff') {
        isAvailable = false
        unavailableReason = `Assigned to ${item.assigned_to_name} (long-term)`
      }
      // Rule 2: Check if item has a return date that conflicts
      else if (item.expected_return_date && item.assignment_type === 'event_checkout') {
        const returnDate = new Date(item.expected_return_date)

        // If the return date is after the requested start date, it's a conflict
        if (returnDate > requestStart) {
          isAvailable = false
          unavailableReason = `Returns ${returnDate.toLocaleDateString()} (${item.assigned_to_name || 'assigned'})`

          // However, if it returns before the requested end date, note that
          if (returnDate <= requestEnd) {
            item.returns_during_period = true
            item.available_from = returnDate.toISOString()
          }
        }
      }
      // Rule 3: Check if assigned to an event during this period
      else if (item.event_id && item.event_date) {
        const eventDate = new Date(item.event_date)

        // Simple check: if event is within requested range, it's unavailable
        if (eventDate >= requestStart && eventDate <= requestEnd) {
          isAvailable = false
          unavailableReason = `Booked for ${item.event_name} on ${eventDate.toLocaleDateString()}`
        }
      }

      if (isAvailable) {
        available.push({
          ...item,
          availability_status: 'available',
          location: item.assigned_to_name || 'Unassigned'
        })
      } else {
        unavailable.push({
          ...item,
          availability_status: 'unavailable',
          unavailable_reason: unavailableReason
        })
      }
    })

    return NextResponse.json({
      available,
      unavailable,
      summary: {
        total: items.length,
        available: available.length,
        unavailable: unavailable.length,
        start_date: startDate,
        end_date: endDate
      }
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
