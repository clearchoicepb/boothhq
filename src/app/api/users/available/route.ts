import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { DepartmentId } from '@/lib/departments'

const log = createLogger('api:users:available')

/**
 * Conflict information for a user
 */
interface Conflict {
  event_id: string
  event_title: string
  event_date: string
}

/**
 * Available user with conflict information and payroll data
 */
export interface AvailableUser {
  id: string
  first_name: string
  last_name: string
  email: string
  home_latitude: number | null
  home_longitude: number | null
  is_available: boolean
  conflicts: Conflict[]
  // Payroll fields
  user_type: 'staff' | 'white_label' | null
  pay_type: 'hourly' | 'flat_rate' | null
  pay_rate: number | null
  default_flat_rate: number | null
}

/**
 * GET /api/users/available
 *
 * Returns users with availability status for a specific event.
 *
 * Query parameters:
 * - event_id: string (required) - The event to check availability for
 * - department: 'operations' | 'design' | 'event_staff' (required) - Filter by department
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const department = searchParams.get('department') as DepartmentId | null

    if (!eventId) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    if (!department) {
      return NextResponse.json({ error: 'department is required' }, { status: 400 })
    }

    // Step 1: Get the event's dates
    // First try from event_dates table, fall back to start_date from events
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        start_date,
        end_date,
        event_dates(
          id,
          event_date
        )
      `)
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !eventData) {
      log.error({ error: eventError, eventId }, 'Failed to fetch event')
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Collect all dates for this event
    const eventDates: string[] = []
    if (eventData.event_dates && Array.isArray(eventData.event_dates)) {
      eventData.event_dates.forEach((d: any) => {
        if (d.event_date) {
          eventDates.push(d.event_date)
        }
      })
    }
    // If no event_dates, use the event's start_date
    if (eventDates.length === 0 && eventData.start_date) {
      eventDates.push(eventData.start_date)
    }

    if (eventDates.length === 0) {
      log.warn({ eventId }, 'Event has no dates')
      return NextResponse.json({ error: 'Event has no dates' }, { status: 400 })
    }

    // Step 2: Get all active, non-archived users in the specified department (including payroll fields)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, departments, home_latitude, home_longitude, user_type, pay_type, pay_rate, default_flat_rate')
      .eq('tenant_id', dataSourceTenantId)
      .eq('status', 'active')
      .is('archived_at', null) // Exclude archived users from assignment dropdowns
      .order('first_name', { ascending: true })

    if (usersError) {
      log.error({ error: usersError }, 'Failed to fetch users')
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Filter users by department
    const filteredUsers = (users || []).filter(user => {
      const userDepts: string[] = user.departments || []
      return userDepts.includes(department)
    })

    if (filteredUsers.length === 0) {
      return NextResponse.json([])
    }

    const userIds = filteredUsers.map(u => u.id)

    // Step 3: Get all staff assignments for these users on the event dates
    // We need to check if users are assigned to OTHER events on these dates
    const { data: conflictingAssignments, error: assignmentsError } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        user_id,
        event_id,
        event_date_id,
        events!event_staff_assignments_event_id_fkey(
          id,
          title,
          start_date
        ),
        event_dates!event_staff_assignments_event_date_id_fkey(
          event_date
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .in('user_id', userIds)
      .neq('event_id', eventId) // Exclude assignments to THIS event

    if (assignmentsError) {
      log.error({ error: assignmentsError }, 'Failed to fetch conflicting assignments')
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    // Build a map of user_id -> conflicts
    const userConflicts: Record<string, Conflict[]> = {}

    conflictingAssignments?.forEach(assignment => {
      // Determine the date of this assignment
      let assignmentDate: string | null = null

      if (assignment.event_dates) {
        // Assignment has a specific event_date_id
        assignmentDate = (assignment.event_dates as any).event_date
      } else if (assignment.events) {
        // Assignment is event-level, use event's start_date
        assignmentDate = (assignment.events as any).start_date
      }

      if (!assignmentDate) return

      // Check if this assignment's date overlaps with our event's dates
      const isConflicting = eventDates.some(ed => ed === assignmentDate)

      if (isConflicting) {
        if (!userConflicts[assignment.user_id]) {
          userConflicts[assignment.user_id] = []
        }

        // Avoid duplicate conflicts
        const existingConflict = userConflicts[assignment.user_id].find(
          c => c.event_id === assignment.event_id && c.event_date === assignmentDate
        )

        if (!existingConflict) {
          userConflicts[assignment.user_id].push({
            event_id: assignment.event_id,
            event_title: (assignment.events as any)?.title || 'Unknown Event',
            event_date: assignmentDate
          })
        }
      }
    })

    // Step 4: Build the response (including payroll fields)
    const availableUsers: AvailableUser[] = filteredUsers.map(user => {
      const conflicts = userConflicts[user.id] || []
      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        home_latitude: user.home_latitude ?? null,
        home_longitude: user.home_longitude ?? null,
        is_available: conflicts.length === 0,
        conflicts,
        // Payroll fields
        user_type: user.user_type ?? null,
        pay_type: user.pay_type ?? null,
        pay_rate: user.pay_rate ?? null,
        default_flat_rate: user.default_flat_rate ?? null
      }
    })

    // Sort: available users first, then by name
    availableUsers.sort((a, b) => {
      if (a.is_available && !b.is_available) return -1
      if (!a.is_available && b.is_available) return 1
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    })

    return NextResponse.json(availableUsers)
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/users/available')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
