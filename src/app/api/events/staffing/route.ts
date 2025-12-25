import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events:staffing')

/**
 * Staff assignment info for a role
 */
interface StaffAssignment {
  assignment_id: string
  user_id: string
  first_name: string
  last_name: string
}

/**
 * Location coordinates for distance calculation
 */
interface LocationCoordinates {
  latitude: number | null
  longitude: number | null
}

/**
 * Event staffing item returned by this API
 */
export interface EventStaffingItem {
  id: string
  title: string
  start_date: string
  end_date: string | null
  status: string
  location: string | null
  location_coordinates: LocationCoordinates | null
  account: {
    id: string
    name: string
  } | null
  event_manager: StaffAssignment | null
  graphic_designer: StaffAssignment | null
  event_staff_count: number
  needs_event_manager: boolean
  needs_designer: boolean
  needs_event_staff: boolean
}

/**
 * GET /api/events/staffing
 *
 * Returns events with their staffing status for the staffing dashboard.
 *
 * Query parameters:
 * - needs: 'event_manager' | 'designer' | 'event_staff' | 'all' (default: 'all')
 * - days_ahead: number (default: null = all upcoming, use 90 for event_staff tab)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const needsFilter = searchParams.get('needs') || 'all'
    const daysAhead = searchParams.get('days_ahead')

    // Calculate date filters
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    let endDateFilter: string | null = null
    if (daysAhead) {
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + parseInt(daysAhead, 10))
      endDateFilter = endDate.toISOString().split('T')[0]
    }

    // Fetch all upcoming events that are not cancelled or completed
    // Join locations table for proper address display
    let eventsQuery = supabase
      .from('events')
      .select(`
        id,
        title,
        start_date,
        end_date,
        status,
        location,
        location_id,
        account_id,
        accounts!events_account_id_fkey(id, name),
        locations!events_location_id_fkey(id, name, address_line1, city, state, latitude, longitude),
        event_dates(
          id,
          event_date,
          location_id,
          locations(id, name, address_line1, city, state, latitude, longitude)
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('start_date', today)
      .order('start_date', { ascending: true })

    if (endDateFilter) {
      eventsQuery = eventsQuery.lte('start_date', endDateFilter)
    }

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      log.error({ error: eventsError }, 'Failed to fetch events')
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json([])
    }

    const eventIds = events.map(e => e.id)

    // Fetch all staff assignments for these events
    const { data: staffAssignments, error: staffError } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        event_id,
        user_id,
        event_date_id,
        staff_role_id,
        users!event_staff_assignments_user_id_fkey(id, first_name, last_name),
        staff_roles!event_staff_assignments_staff_role_id_fkey(id, name, type)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .in('event_id', eventIds)

    if (staffError) {
      log.error({ error: staffError }, 'Failed to fetch staff assignments')
      return NextResponse.json({ error: 'Failed to fetch staff assignments' }, { status: 500 })
    }

    // Group assignments by event
    const assignmentsByEvent: Record<string, typeof staffAssignments> = {}
    staffAssignments?.forEach(assignment => {
      if (!assignmentsByEvent[assignment.event_id]) {
        assignmentsByEvent[assignment.event_id] = []
      }
      assignmentsByEvent[assignment.event_id].push(assignment)
    })

    /**
     * Get the display location and coordinates for an event
     * Priority: 1) First event_date's location, 2) Event's location_id, 3) Event's location text field
     */
    const getEventLocation = (event: any): { name: string | null; coordinates: LocationCoordinates | null } => {
      // Check event_dates first (for per-date locations)
      const eventDates = event.event_dates as any[]
      if (eventDates && eventDates.length > 0) {
        const firstDate = eventDates[0]
        if (firstDate.locations?.name) {
          return {
            name: firstDate.locations.name,
            coordinates: {
              latitude: firstDate.locations.latitude ?? null,
              longitude: firstDate.locations.longitude ?? null
            }
          }
        }
      }

      // Check event-level location via location_id
      if (event.locations?.name) {
        return {
          name: event.locations.name,
          coordinates: {
            latitude: event.locations.latitude ?? null,
            longitude: event.locations.longitude ?? null
          }
        }
      }

      // Fall back to text location field (no coordinates available)
      return {
        name: event.location || null,
        coordinates: null
      }
    }

    // Transform events with staffing info
    const staffingItems: EventStaffingItem[] = events.map(event => {
      const assignments = assignmentsByEvent[event.id] || []

      // Find Event Manager (operations role, name contains 'manager')
      const eventManagerAssignment = assignments.find(a => {
        const roleName = (a.staff_roles as any)?.name?.toLowerCase() || ''
        const roleType = (a.staff_roles as any)?.type || ''
        return roleType === 'operations' &&
          (roleName.includes('manager') || roleName.includes('event manager'))
      })

      // Find Graphic Designer (operations role, name contains 'designer' or 'graphic')
      const designerAssignment = assignments.find(a => {
        const roleName = (a.staff_roles as any)?.name?.toLowerCase() || ''
        const roleType = (a.staff_roles as any)?.type || ''
        return roleType === 'operations' &&
          (roleName.includes('designer') || roleName.includes('graphic'))
      })

      // Count event staff (event_staff type roles or has event_date_id)
      const eventStaffCount = assignments.filter(a => {
        const roleType = (a.staff_roles as any)?.type || ''
        return roleType === 'event_staff' || a.event_date_id
      }).length

      const formatAssignment = (assignment: any): StaffAssignment | null => {
        if (!assignment) return null
        const user = assignment.users as any
        return {
          assignment_id: assignment.id,
          user_id: assignment.user_id,
          first_name: user?.first_name || '',
          last_name: user?.last_name || ''
        }
      }

      const locationData = getEventLocation(event)

      return {
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        status: event.status,
        location: locationData.name,
        location_coordinates: locationData.coordinates,
        account: event.accounts ? {
          id: (event.accounts as any).id,
          name: (event.accounts as any).name
        } : null,
        event_manager: formatAssignment(eventManagerAssignment),
        graphic_designer: formatAssignment(designerAssignment),
        event_staff_count: eventStaffCount,
        needs_event_manager: !eventManagerAssignment,
        needs_designer: !designerAssignment,
        needs_event_staff: eventStaffCount === 0
      }
    })

    // Apply filter based on 'needs' parameter
    let filteredItems = staffingItems
    switch (needsFilter) {
      case 'event_manager':
        filteredItems = staffingItems.filter(item => item.needs_event_manager)
        break
      case 'designer':
        filteredItems = staffingItems.filter(item => item.needs_designer)
        break
      case 'event_staff':
        filteredItems = staffingItems.filter(item => item.needs_event_staff)
        break
      case 'all':
      default:
        // Return all events that need any staffing
        filteredItems = staffingItems.filter(
          item => item.needs_event_manager || item.needs_designer || item.needs_event_staff
        )
        break
    }

    return NextResponse.json(filteredItems)
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/events/staffing')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
