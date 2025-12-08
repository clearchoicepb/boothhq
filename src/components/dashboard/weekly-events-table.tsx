'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Building2, Eye } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { getWeekRange, isDateInRange, formatDateShort, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'
import { getEventPriority } from '@/lib/utils/event-priority'
import type { Event } from '@/types/events'

interface StaffAssignment {
  id: string
  user_id: string
  event_id: string
  event_date_id: string | null
  staff_role_id: string | null
  users?: {
    id: string
    first_name: string
    last_name: string
  }
  staff_roles?: {
    id: string
    name: string
    type: 'operations' | 'event_staff'
    sort_order: number
  }
}

interface GroupedStaffByType {
  type: 'operations' | 'event_staff'
  displayName: string
  staff: { firstName: string; lastName: string }[]
}

// Format name as "First Name + Last Initial" (e.g., "John S.")
function formatStaffName(firstName: string, lastName: string): string {
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : ''
  return `${firstName} ${lastInitial}`.trim()
}

// Get display name for staff type
function getTypeDisplayName(type: 'operations' | 'event_staff'): string {
  return type === 'operations' ? 'Operations Team' : 'Event Staff'
}

// Group staff by type (operations vs event_staff), matching the event detail staffing tab
function groupStaffByType(assignments: StaffAssignment[]): GroupedStaffByType[] {
  const grouped: Record<string, GroupedStaffByType> = {}

  assignments.forEach(assignment => {
    if (!assignment.users || !assignment.staff_roles) return

    const staffType = assignment.staff_roles.type

    if (!grouped[staffType]) {
      grouped[staffType] = {
        type: staffType,
        displayName: getTypeDisplayName(staffType),
        staff: []
      }
    }

    grouped[staffType].staff.push({
      firstName: assignment.users.first_name,
      lastName: assignment.users.last_name
    })
  })

  // Sort: operations first, then event_staff
  return Object.values(grouped).sort((a, b) => {
    if (a.type === 'operations' && b.type !== 'operations') return -1
    if (a.type !== 'operations' && b.type === 'operations') return 1
    return 0
  })
}

interface WeeklyEventsTableProps {
  tenantSubdomain: string
}

interface EventDateRow {
  eventId: string
  eventDateId: string
  eventDate: string
  event: Event
  location: string
}

export function WeeklyEventsTable({ tenantSubdomain }: WeeklyEventsTableProps) {
  const { data: events = [], isLoading } = useEvents()
  const weekRange = useMemo(() => getWeekRange(), [])

  // Filter and flatten events to show upcoming event dates within this week (today and future only)
  const weeklyEventDates: EventDateRow[] = useMemo(() => {
    const rows: EventDateRow[] = []

    events.forEach(event => {
      const eventDates = event.event_dates || []

      if (eventDates.length === 0) {
        // Event has no event_dates, check start_date
        if (event.start_date && isDateInRange(event.start_date, weekRange)) {
          const daysUntil = getDaysUntil(event.start_date)
          // Only include if today or future (daysUntil >= 0)
          if (daysUntil !== null && daysUntil >= 0) {
            rows.push({
              eventId: event.id,
              eventDateId: event.id,
              eventDate: event.start_date,
              event,
              location: event.location || 'No location'
            })
          }
        }
      } else {
        // Check each event date
        eventDates.forEach(ed => {
          if (isDateInRange(ed.event_date, weekRange)) {
            const daysUntil = getDaysUntil(ed.event_date)
            // Only include if today or future (daysUntil >= 0)
            if (daysUntil !== null && daysUntil >= 0) {
              rows.push({
                eventId: event.id,
                eventDateId: ed.id,
                eventDate: ed.event_date,
                event,
                location: ed.locations?.name || event.location || 'No location'
              })
            }
          }
        })
      }
    })

    // Sort by event date ascending
    rows.sort((a, b) => a.eventDate.localeCompare(b.eventDate))

    return rows
  }, [events, weekRange])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#347dc4]" />
            <h2 className="text-lg font-medium text-gray-900">Upcoming Events This Week</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#347dc4]" />
            <h2 className="text-lg font-medium text-gray-900">Upcoming Events This Week</h2>
          </div>
          <span className="text-sm text-gray-500">
            {weeklyEventDates.length} event{weeklyEventDates.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {weeklyEventDates.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No upcoming events this week</p>
          <p className="text-sm text-gray-400 mt-1">Upcoming events will appear here.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staffing Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {weeklyEventDates.map(row => {
                  const { event, eventDate, eventDateId, location } = row
                  const daysUntil = getDaysUntil(eventDate)
                  const { config: priority } = getEventPriority(daysUntil)
                  const isToday = isDateToday(eventDate)

                  return (
                    <tr key={eventDateId} className={`hover:bg-gray-50 ${priority.border}`}>
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateShort(eventDate)}
                          </span>
                          {isToday && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                              TODAY
                            </span>
                          )}
                          {!isToday && daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priority.bg} ${priority.text}`}>
                              {daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Event Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/${tenantSubdomain}/events/${event.id}`}
                          className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
                        >
                          {event.title || 'Untitled Event'}
                        </Link>
                        {event.event_categories && (
                          <div className="mt-1">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: event.event_categories.color + '20',
                                color: event.event_categories.color
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: event.event_categories.color }}
                              />
                              {event.event_categories.name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Account */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {event.account_name || 'No account'}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-32" title={location}>
                            {location}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.event_types ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {event.event_types.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No type</span>
                        )}
                      </td>

                      {/* Staffing Details */}
                      <td className="px-6 py-4 align-middle">
                        {(() => {
                          const staffAssignments = (event.event_staff_assignments || []) as StaffAssignment[]
                          const groupedStaff = groupStaffByType(staffAssignments)

                          if (groupedStaff.length === 0) {
                            return null
                          }

                          return (
                            <div className="space-y-2">
                              {groupedStaff.map((group, groupIndex) => (
                                <div key={groupIndex}>
                                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                                    {group.displayName}
                                  </div>
                                  <div className="space-y-0.5">
                                    {group.staff.map((person, personIndex) => (
                                      <div key={personIndex} className="text-sm text-gray-700">
                                        {formatStaffName(person.firstName, person.lastName)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            {weeklyEventDates.map(row => {
              const { event, eventDate, eventDateId, location } = row
              const daysUntil = getDaysUntil(eventDate)
              const { config: priority } = getEventPriority(daysUntil)
              const isToday = isDateToday(eventDate)

              return (
                <div key={eventDateId} className={`p-4 ${priority.border} border-l-4`}>
                  <div className="mb-2">
                    <Link
                      href={`/${tenantSubdomain}/events/${event.id}`}
                      className="text-sm font-medium text-[#347dc4] hover:underline"
                    >
                      {event.title || 'Untitled Event'}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {formatDateShort(eventDate)}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {event.account_name && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {event.account_name}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {location}
                    </div>
                  </div>

                  {/* Staffing Details */}
                  {(() => {
                    const staffAssignments = (event.event_staff_assignments || []) as StaffAssignment[]
                    const groupedStaff = groupStaffByType(staffAssignments)

                    if (groupedStaff.length === 0) {
                      return null
                    }

                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {groupedStaff.map((group, groupIndex) => (
                          <div key={groupIndex}>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                              {group.displayName}
                            </div>
                            <div className="space-y-0.5">
                              {group.staff.map((person, personIndex) => (
                                <div key={personIndex} className="text-sm text-gray-700">
                                  {formatStaffName(person.firstName, person.lastName)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div className="mt-3">
                    <Link
                      href={`/${tenantSubdomain}/events/${event.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[#347dc4] rounded-md hover:bg-[#2c6ba8] transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
