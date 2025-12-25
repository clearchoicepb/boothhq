'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEventStaffing, type StaffingNeedsFilter } from '@/hooks/useEventStaffing'
import { StaffAssignmentDropdown } from './StaffAssignmentDropdown'
import { EventStaffAssignmentModal } from './EventStaffAssignmentModal'
import { formatDateShort } from '@/lib/utils/date-utils'
import { Calendar, MapPin, Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffingTableProps {
  roleType: 'event_manager' | 'designer' | 'event_staff'
  daysAhead: number | null
}

/**
 * Maps role type to the API filter value
 */
function getRoleFilter(roleType: StaffingTableProps['roleType']): StaffingNeedsFilter {
  switch (roleType) {
    case 'event_manager':
      return 'event_manager'
    case 'designer':
      return 'designer'
    case 'event_staff':
      return 'event_staff'
    default:
      return 'all'
  }
}

/**
 * Maps role type to department for user filtering
 */
function getDepartment(roleType: StaffingTableProps['roleType']): 'operations' | 'design' | 'event_staff' {
  switch (roleType) {
    case 'event_manager':
      return 'operations'
    case 'designer':
      return 'design'
    case 'event_staff':
      return 'event_staff'
    default:
      return 'operations'
  }
}

/**
 * Get display title for the role type
 */
function getRoleTitle(roleType: StaffingTableProps['roleType']): string {
  switch (roleType) {
    case 'event_manager':
      return 'Event Manager'
    case 'designer':
      return 'Graphic Designer'
    case 'event_staff':
      return 'Event Staff'
    default:
      return 'Staff'
  }
}

export function StaffingTable({ roleType, daysAhead }: StaffingTableProps) {
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  // Modal state for event staff assignment
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string
    title: string
    location: string | null
  } | null>(null)

  const {
    data: events,
    isLoading,
    error,
    refetch
  } = useEventStaffing({
    needs: getRoleFilter(roleType),
    daysAhead: daysAhead ?? undefined
  })

  const handleOpenAssignModal = (event: { id: string; title: string; location: string | null }) => {
    setSelectedEvent(event)
  }

  const handleCloseAssignModal = () => {
    setSelectedEvent(null)
  }

  const handleStaffAssigned = () => {
    refetch()
    setSelectedEvent(null)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center text-red-600">
          <p className="font-medium">Failed to load staffing data</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            All caught up!
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {roleType === 'event_staff'
              ? `No events in the next ${daysAhead} days need ${getRoleTitle(roleType).toLowerCase()} assignments.`
              : `No upcoming events need ${getRoleTitle(roleType).toLowerCase()} assignments.`
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Events Needing {getRoleTitle(roleType)}
          </h3>
          <span className="text-sm text-gray-500">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[220px]">
                {roleType === 'event_staff' ? 'Staff Count' : 'Assignment'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                {/* Event Name */}
                <td className="px-6 py-4">
                  <Link
                    href={`/${tenantSubdomain}/events/${event.id}`}
                    className="text-[#347dc4] hover:text-[#2c6ba8] font-medium"
                  >
                    {event.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {event.status}
                  </p>
                </td>

                {/* Client */}
                <td className="px-6 py-4">
                  {event.account ? (
                    <Link
                      href={`/${tenantSubdomain}/accounts/${event.account.id}`}
                      className="text-gray-900 hover:text-[#347dc4]"
                    >
                      {event.account.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400 italic">No client</span>
                  )}
                </td>

                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    {formatDateShort(event.start_date)}
                  </div>
                </td>

                {/* Location */}
                <td className="px-6 py-4">
                  {event.location ? (
                    <div className="flex items-center text-sm text-gray-900 max-w-48 truncate" title={event.location}>
                      <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">No location</span>
                  )}
                </td>

                {/* Assignment / Staff Count */}
                <td className="px-6 py-4">
                  {roleType === 'event_staff' ? (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <Users className="h-3 w-3 mr-1" />
                        {event.event_staff_count} assigned
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAssignModal({
                          id: event.id,
                          title: event.title,
                          location: event.location
                        })}
                      >
                        + Assign Staff
                      </Button>
                    </div>
                  ) : (
                    <StaffAssignmentDropdown
                      eventId={event.id}
                      roleType={roleType}
                      department={getDepartment(roleType)}
                      currentAssignment={
                        roleType === 'event_manager'
                          ? event.event_manager
                          : event.graphic_designer
                      }
                      onAssigned={() => refetch()}
                      locationCoordinates={event.location_coordinates}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-200">
        {events.map((event) => (
          <div key={event.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Link
                  href={`/${tenantSubdomain}/events/${event.id}`}
                  className="text-[#347dc4] hover:text-[#2c6ba8] font-medium"
                >
                  {event.title}
                </Link>
                <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {event.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {event.account && (
                <div className="flex items-center text-sm text-gray-600">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  {event.account.name}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                {formatDateShort(event.start_date)}
              </div>
              {event.location && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100">
              {roleType === 'event_staff' ? (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <Users className="h-3 w-3 mr-1" />
                    {event.event_staff_count} assigned
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAssignModal({
                      id: event.id,
                      title: event.title,
                      location: event.location
                    })}
                  >
                    + Assign Staff
                  </Button>
                </div>
              ) : (
                <StaffAssignmentDropdown
                  eventId={event.id}
                  roleType={roleType}
                  department={getDepartment(roleType)}
                  currentAssignment={
                    roleType === 'event_manager'
                      ? event.event_manager
                      : event.graphic_designer
                  }
                  onAssigned={() => refetch()}
                  locationCoordinates={event.location_coordinates}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Event Staff Assignment Modal */}
      {selectedEvent && (
        <EventStaffAssignmentModal
          isOpen={!!selectedEvent}
          onClose={handleCloseAssignModal}
          onAssigned={handleStaffAssigned}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          eventLocation={selectedEvent.location}
        />
      )}
    </div>
  )
}
