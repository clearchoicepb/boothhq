'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils/date-utils'
import { formatDistance, getDistanceColorClass } from '@/lib/utils/distance-utils'
import { useStaffDistance, DISTANCE_FILTER_OPTIONS, type DistanceFilterValue, type StaffSortOption } from '@/hooks/useStaffDistance'
import { useStaffRoles } from '@/hooks/useStaffRoles'
import { MapPin, Loader2, Calendar, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  setup_time?: string | null
  status: string
}

interface EventLocation {
  latitude: number | null
  longitude: number | null
  name?: string
}

interface User {
  id: string
  first_name: string
  last_name: string
  email?: string
  home_latitude?: number | null
  home_longitude?: number | null
}

interface DateTimeSelection {
  dateId: string
  startTime: string
  endTime: string
}

interface EventStaffAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssigned: () => void
  eventId: string
  eventTitle: string
  eventLocation?: string | null
}

/**
 * Fetch event details including dates and location for staff assignment
 */
async function fetchEventDetails(eventId: string) {
  const response = await fetch(`/api/events/${eventId}?include=dates,location`)
  if (!response.ok) {
    throw new Error('Failed to fetch event details')
  }
  return response.json()
}

/**
 * Fetch available staff for event assignment
 */
async function fetchAvailableStaff() {
  const response = await fetch('/api/users?department=event_staff&active=true')
  if (!response.ok) {
    throw new Error('Failed to fetch staff')
  }
  return response.json()
}

/**
 * Modal for assigning event staff to events from the Staffing module
 * Includes distance calculation, date selection, and time customization
 */
export function EventStaffAssignmentModal({
  isOpen,
  onClose,
  onAssigned,
  eventId,
  eventTitle,
  eventLocation: eventLocationName
}: EventStaffAssignmentModalProps) {
  const queryClient = useQueryClient()

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedStaffRoleId, setSelectedStaffRoleId] = useState('')
  const [selectedDateTimes, setSelectedDateTimes] = useState<DateTimeSelection[]>([])
  const [staffNotes, setStaffNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch event details (dates and location)
  const {
    data: eventDetails,
    isLoading: eventLoading
  } = useQuery({
    queryKey: ['event-for-staffing', eventId],
    queryFn: () => fetchEventDetails(eventId),
    enabled: isOpen,
    staleTime: 60 * 1000,
  })

  // Fetch available staff
  const {
    data: rawUsers = [],
    isLoading: usersLoading
  } = useQuery({
    queryKey: ['staff-for-assignment'],
    queryFn: fetchAvailableStaff,
    enabled: isOpen,
    staleTime: 60 * 1000,
  })

  // Fetch staff roles
  const { data: staffRoles = [], isLoading: rolesLoading } = useStaffRoles(isOpen)

  // Get event location coordinates for distance calculation
  const eventCoords: EventLocation | null = useMemo(() => {
    if (!eventDetails) return null

    // Try to get from first event date's location
    const firstDate = eventDetails.event_dates?.[0]
    if (firstDate?.locations?.latitude && firstDate?.locations?.longitude) {
      return {
        latitude: firstDate.locations.latitude,
        longitude: firstDate.locations.longitude,
        name: firstDate.locations.name,
      }
    }

    // Fall back to event's location
    if (eventDetails.locations?.latitude && eventDetails.locations?.longitude) {
      return {
        latitude: eventDetails.locations.latitude,
        longitude: eventDetails.locations.longitude,
        name: eventDetails.locations.name,
      }
    }

    return null
  }, [eventDetails])

  // Use staff distance hook for distance calculations
  const {
    displayUsers,
    locationHasCoordinates,
    maxDistance,
    setMaxDistance,
    sortBy,
    setSortBy,
  } = useStaffDistance(rawUsers, { location: eventCoords })

  // Get event_staff roles only
  const eventStaffRoles = useMemo(() =>
    staffRoles.filter((r: { type?: string }) => r.type === 'event_staff'),
    [staffRoles]
  )

  // Event dates from details
  const eventDates: EventDate[] = eventDetails?.event_dates || []

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('')
      setSelectedStaffRoleId('')
      setSelectedDateTimes([])
      setStaffNotes('')
      setErrors({})
    }
  }, [isOpen])

  // Auto-select first event_staff role if only one exists
  useEffect(() => {
    if (eventStaffRoles.length === 1 && !selectedStaffRoleId) {
      setSelectedStaffRoleId(eventStaffRoles[0].id)
    }
  }, [eventStaffRoles, selectedStaffRoleId])

  const handleToggleDate = (dateId: string, checked: boolean) => {
    if (errors.dates) {
      setErrors(prev => ({ ...prev, dates: '' }))
    }

    if (checked) {
      const eventDate = eventDates.find(d => d.id === dateId)
      setSelectedDateTimes([
        ...selectedDateTimes,
        {
          dateId,
          startTime: eventDate?.start_time || '09:00',
          endTime: eventDate?.end_time || '17:00'
        }
      ])
    } else {
      setSelectedDateTimes(selectedDateTimes.filter(dt => dt.dateId !== dateId))
    }
  }

  const handleUpdateDateTime = (dateId: string, field: 'startTime' | 'endTime', value: string) => {
    setSelectedDateTimes(
      selectedDateTimes.map(dt =>
        dt.dateId === dateId ? { ...dt, [field]: value } : dt
      )
    )
  }

  const handleSelectAll = () => {
    const allDateTimes = eventDates.map(eventDate => ({
      dateId: eventDate.id,
      startTime: eventDate.start_time || '09:00',
      endTime: eventDate.end_time || '17:00'
    }))
    setSelectedDateTimes(allDateTimes)
    if (errors.dates) {
      setErrors(prev => ({ ...prev, dates: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedUserId) {
      newErrors.user = 'Please select a staff member'
    }

    if (!selectedStaffRoleId) {
      newErrors.role = 'Please select a staff role'
    }

    if (selectedDateTimes.length === 0) {
      newErrors.dates = 'Please select at least one event date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      // Create one assignment per selected date
      for (const dateTime of selectedDateTimes) {
        const response = await fetch('/api/event-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            user_id: selectedUserId,
            staff_role_id: selectedStaffRoleId,
            event_date_id: dateTime.dateId,
            start_time: dateTime.startTime || null,
            end_time: dateTime.endTime || null,
            notes: staffNotes || null
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to assign staff')
        }
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['event-staffing'] })
      queryClient.invalidateQueries({ queryKey: ['event-staffing-counts'] })
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })

      toast.success(`Staff assigned to ${selectedDateTimes.length} date${selectedDateTimes.length > 1 ? 's' : ''}`)
      onClose()
      onAssigned()
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign staff')
    } finally {
      setIsSaving(false)
    }
  }

  const isLoading = eventLoading || usersLoading || rolesLoading
  const isFormValid = selectedUserId && selectedStaffRoleId && selectedDateTimes.length > 0

  // Get selected user for distance display
  const selectedUser = displayUsers.find(u => u.id === selectedUserId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Event Staff"
      className="sm:max-w-lg"
    >
      {/* Event Info Header */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900">{eventTitle}</h3>
        {eventLocationName && (
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{eventLocationName}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Staff Member Selection */}
          <div>
            <label htmlFor="staff-member-select" className="block text-sm font-medium text-gray-700 mb-2">
              Staff Member <span className="text-red-500">*</span>
            </label>

            {/* Distance Filter & Sort Controls */}
            {locationHasCoordinates && (
              <div className="flex gap-2 mb-2">
                <select
                  id="distance-filter"
                  name="distance-filter"
                  title="Filter by distance"
                  value={maxDistance ?? ''}
                  onChange={(e) => setMaxDistance(e.target.value === '' ? null : Number(e.target.value) as DistanceFilterValue)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                >
                  {DISTANCE_FILTER_OPTIONS.map(option => (
                    <option key={option.label} value={option.value ?? ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  id="sort-by"
                  name="sort-by"
                  title="Sort by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as StaffSortOption)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                >
                  <option value="name">Sort: Name</option>
                  <option value="distance">Sort: Nearest</option>
                </select>
              </div>
            )}

            <select
              id="staff-member-select"
              name="staff-member"
              title="Staff Member"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value)
                if (errors.user) setErrors(prev => ({ ...prev, user: '' }))
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.user ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">-- Select Staff Member --</option>
              {displayUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                  {locationHasCoordinates && user.distance != null && ` (${formatDistance(user.distance)})`}
                  {locationHasCoordinates && user.distance == null && !user.hasCoordinates && ' (No address)'}
                </option>
              ))}
            </select>

            {/* Show selected user's distance prominently */}
            {selectedUser && locationHasCoordinates && selectedUser.distance != null && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${getDistanceColorClass(selectedUser.distance)}`}>
                <MapPin className="h-3 w-3" />
                <span>{formatDistance(selectedUser.distance)} from event location</span>
              </div>
            )}

            {errors.user && (
              <p className="text-sm text-red-600 mt-1">{errors.user}</p>
            )}
          </div>

          {/* Staff Role Selection */}
          <div>
            <label htmlFor="staff-role-select" className="block text-sm font-medium text-gray-700 mb-2">
              Staff Role <span className="text-red-500">*</span>
            </label>
            <select
              id="staff-role-select"
              name="staff-role"
              title="Staff Role"
              value={selectedStaffRoleId}
              onChange={(e) => {
                setSelectedStaffRoleId(e.target.value)
                if (errors.role) setErrors(prev => ({ ...prev, role: '' }))
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.role ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">-- Select Role --</option>
              {eventStaffRoles.map((role: { id: string; name: string }) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-sm text-red-600 mt-1">{errors.role}</p>
            )}
          </div>

          {/* Event Dates Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Event Dates <span className="text-red-500">*</span>
              </label>
              {eventDates.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-[#347dc4] hover:text-[#2c6ba8]"
                >
                  Select All ({eventDates.length})
                </button>
              )}
            </div>

            {eventDates.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No event dates available</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {eventDates.map(eventDate => {
                  const isSelected = selectedDateTimes.some(dt => dt.dateId === eventDate.id)
                  const dateTime = selectedDateTimes.find(dt => dt.dateId === eventDate.id)

                  return (
                    <div key={eventDate.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`date-${eventDate.id}`}
                          checked={isSelected}
                          onChange={(e) => handleToggleDate(eventDate.id, e.target.checked)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <label htmlFor={`date-${eventDate.id}`} className="block text-sm font-medium text-gray-900 cursor-pointer">
                            <Calendar className="h-4 w-4 inline mr-1 text-gray-400" />
                            {formatDate(eventDate.event_date, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </label>

                          {isSelected && dateTime && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor={`start-time-${eventDate.id}`} className="block text-xs text-gray-600 mb-1">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Start
                                </label>
                                <input
                                  id={`start-time-${eventDate.id}`}
                                  name={`start-time-${eventDate.id}`}
                                  title="Start Time"
                                  type="time"
                                  value={dateTime.startTime}
                                  onChange={(e) => handleUpdateDateTime(eventDate.id, 'startTime', e.target.value)}
                                  className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label htmlFor={`end-time-${eventDate.id}`} className="block text-xs text-gray-600 mb-1">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  End
                                </label>
                                <input
                                  id={`end-time-${eventDate.id}`}
                                  name={`end-time-${eventDate.id}`}
                                  title="End Time"
                                  type="time"
                                  value={dateTime.endTime}
                                  onChange={(e) => handleUpdateDateTime(eventDate.id, 'endTime', e.target.value)}
                                  className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {errors.dates && (
              <p className="text-sm text-red-600 mt-2">{errors.dates}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="staff-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              id="staff-notes"
              name="staff-notes"
              title="Staff Notes"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Any assignment-specific notes..."
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading || isSaving}
          className={(!isFormValid || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Assigning...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Assign Staff
            </>
          )}
        </Button>
      </div>
    </Modal>
  )
}
