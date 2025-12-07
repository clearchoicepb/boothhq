'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Building2, Eye } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { getWeekRange, isDateInRange, formatDateShort, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'
import { getEventPriority } from '@/lib/utils/event-priority'
import type { Event } from '@/types/events'

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

  // Filter and flatten events to show event dates within this week
  const weeklyEventDates: EventDateRow[] = useMemo(() => {
    const rows: EventDateRow[] = []

    events.forEach(event => {
      const eventDates = event.event_dates || []

      if (eventDates.length === 0) {
        // Event has no event_dates, check start_date
        if (event.start_date && isDateInRange(event.start_date, weekRange)) {
          rows.push({
            eventId: event.id,
            eventDateId: event.id,
            eventDate: event.start_date,
            event,
            location: event.location || 'No location'
          })
        }
      } else {
        // Check each event date
        eventDates.forEach(ed => {
          if (isDateInRange(ed.event_date, weekRange)) {
            rows.push({
              eventId: event.id,
              eventDateId: ed.id,
              eventDate: ed.event_date,
              event,
              location: ed.locations?.name || event.location || 'No location'
            })
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
            <h2 className="text-lg font-medium text-gray-900">This Week&apos;s Events</h2>
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
            <h2 className="text-lg font-medium text-gray-900">This Week&apos;s Events</h2>
          </div>
          <span className="text-sm text-gray-500">
            {weeklyEventDates.length} event{weeklyEventDates.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {weeklyEventDates.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No events scheduled this week</p>
          <p className="text-sm text-gray-400 mt-1">Events for this week will appear here.</p>
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'completed' ? 'bg-green-100 text-green-800' :
                          event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          event.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status || 'Unknown'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/${tenantSubdomain}/events/${event.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#347dc4] bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
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
                  <div className="flex items-start justify-between mb-2">
                    <div>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      event.status === 'completed' ? 'bg-green-100 text-green-800' :
                      event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status || 'Unknown'}
                    </span>
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
