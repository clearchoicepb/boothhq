'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date-utils'
import { formatDistance, getDistanceColorClass } from '@/lib/utils/distance-utils'
import { useStaffDistance, DISTANCE_FILTER_OPTIONS, type DistanceFilterValue, type StaffSortOption } from '@/hooks/useStaffDistance'
import { useStaffRoles } from '@/hooks/useStaffRoles'
import { useAvailableUsers } from '@/hooks/useAvailableUsers'
import { MapPin, Loader2, Calendar, Clock, Users, AlertTriangle } from 'lucide-react'
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
  // Payroll fields
  user_type?: 'staff' | 'white_label' | null
  pay_type?: 'hourly' | 'flat_rate' | null
  pay_rate?: number | null
  default_flat_rate?: number | null
}

interface DateTimeSelection {
  dateId: string
  arrivalTime: string  // Staff-specific arrival time
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

  // Pay override state
  const [payTypeOverride, setPayTypeOverride] = useState<'default' | 'flat_rate'>('default')
  const [flatRateAmount, setFlatRateAmount] = useState<string>('')

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

  // Fetch available staff with conflict detection
  const {
    data: rawUsers = [],
    isLoading: usersLoading
  } = useAvailableUsers(isOpen ? eventId : null, isOpen ? 'event_staff' : null)

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
      setPayTypeOverride('default')
      setFlatRateAmount('')
    }
  }, [isOpen])

  // Get selected user's pay info from rawUsers (which contains payroll fields from API)
  const selectedUserPayInfo = useMemo(() => {
    if (!selectedUserId) return null
    // rawUsers comes from useAvailableUsers which fetches payroll fields
    const user = rawUsers.find(u => u.id === selectedUserId)
    if (!user) return null

    // Access payroll fields - cast to any to access fields that may not be in the base User interface
    const userData = user as any
    return {
      userType: (userData.user_type as 'staff' | 'white_label') || 'staff',
      payType: (userData.pay_type as 'hourly' | 'flat_rate') || 'hourly',
      payRate: userData.pay_rate ?? null,
      defaultFlatRate: userData.default_flat_rate ?? null
    }
  }, [selectedUserId, rawUsers])

  // When user changes, reset pay override and optionally pre-fill flat rate
  useEffect(() => {
    if (!selectedUserId) return

    // Reset pay override to default when user changes
    setPayTypeOverride('default')

    // Find the user to get their pay info
    const user = rawUsers.find(u => u.id === selectedUserId) as any
    if (!user) return

    const userType = user.user_type || 'staff'
    const defaultFlatRate = user.default_flat_rate

    // For white_label users, pre-fill with default if it exists
    if (userType === 'white_label' && defaultFlatRate) {
      setFlatRateAmount(defaultFlatRate.toString())
    } else {
      setFlatRateAmount('')
    }
  }, [selectedUserId, rawUsers])

  // Auto-select first event_staff role if only one exists
  useEffect(() => {
    if (eventStaffRoles.length === 1 && !selectedStaffRoleId) {
      setSelectedStaffRoleId(eventStaffRoles[0].id)
    }
  }, [eventStaffRoles, selectedStaffRoleId])

  // Normalize time string to HH:MM format (remove seconds if present)
  const normalizeTime = (time: string | null | undefined): string => {
    if (!time) return '09:00'
    // Handle HH:MM:SS format from database
    const parts = time.split(':')
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
    }
    return time
  }

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
          arrivalTime: normalizeTime(eventDate?.setup_time || eventDate?.start_time),
          startTime: normalizeTime(eventDate?.start_time),
          endTime: normalizeTime(eventDate?.end_time)
        }
      ])
    } else {
      setSelectedDateTimes(selectedDateTimes.filter(dt => dt.dateId !== dateId))
    }
  }

  const handleUpdateDateTime = (dateId: string, field: 'arrivalTime' | 'startTime' | 'endTime', value: string) => {
    setSelectedDateTimes(
      selectedDateTimes.map(dt =>
        dt.dateId === dateId ? { ...dt, [field]: value } : dt
      )
    )
  }

  const handleSelectAll = () => {
    const allDateTimes = eventDates.map(eventDate => ({
      dateId: eventDate.id,
      arrivalTime: eventDate.setup_time || eventDate.start_time || '09:00',
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

    // Validate flat rate amount when required
    if (selectedUserPayInfo) {
      const isWhiteLabel = selectedUserPayInfo.userType === 'white_label'
      const isFlatRateOverride = payTypeOverride === 'flat_rate'

      if (isWhiteLabel || isFlatRateOverride) {
        if (!flatRateAmount || parseFloat(flatRateAmount) <= 0) {
          newErrors.flatRate = 'Please enter a flat rate amount'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      // Determine pay type override value
      const isWhiteLabel = selectedUserPayInfo?.userType === 'white_label'
      const payTypeOverrideValue = isWhiteLabel ? 'flat_rate' : (payTypeOverride === 'flat_rate' ? 'flat_rate' : null)
      const flatRateValue = (isWhiteLabel || payTypeOverride === 'flat_rate') ? parseFloat(flatRateAmount) : null

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
            arrival_time: dateTime.arrivalTime || null,
            start_time: dateTime.startTime || null,
            end_time: dateTime.endTime || null,
            notes: staffNotes || null,
            // Payroll fields
            pay_type_override: payTypeOverrideValue,
            flat_rate_amount: flatRateValue
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

  // Get selected user for distance display and conflict check
  const selectedUser = displayUsers.find(u => u.id === selectedUserId)

  // Check if selected user has conflicts (cast to access conflict properties)
  const selectedUserWithConflicts = rawUsers.find(u => u.id === selectedUserId)
  const hasConflicts = selectedUserWithConflicts && !selectedUserWithConflicts.is_available

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
                errors.user ? 'border-red-500' : hasConflicts ? 'border-amber-500 text-red-600' : 'border-gray-300'
              }`}
            >
              <option value="">-- Select Staff Member --</option>
              {displayUsers.map(user => {
                // Find conflict info from rawUsers
                const userWithConflicts = rawUsers.find(u => u.id === user.id)
                const userHasConflict = userWithConflicts && !userWithConflicts.is_available

                return (
                  <option
                    key={user.id}
                    value={user.id}
                    className={userHasConflict ? 'text-red-600' : ''}
                  >
                    {userHasConflict ? '⚠ ' : ''}{user.first_name} {user.last_name}
                    {userHasConflict && ' - SCHEDULED'}
                    {locationHasCoordinates && user.distance != null && ` (${formatDistance(user.distance)})`}
                    {locationHasCoordinates && user.distance == null && !user.hasCoordinates && ' (No address)'}
                  </option>
                )
              })}
            </select>

            {/* Show selected user's distance prominently */}
            {selectedUser && locationHasCoordinates && selectedUser.distance != null && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${getDistanceColorClass(selectedUser.distance)}`}>
                <MapPin className="h-3 w-3" />
                <span>{formatDistance(selectedUser.distance)} from event location</span>
              </div>
            )}

            {/* Show conflict warning when a staff member with conflicts is selected */}
            {hasConflicts && selectedUserWithConflicts && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Already scheduled on:</p>
                    <ul className="mt-1 list-disc list-inside">
                      {selectedUserWithConflicts.conflicts.map((conflict, idx) => (
                        <li key={idx}>
                          {conflict.event_title} ({formatDate(conflict.event_date, { month: 'short', day: 'numeric' })})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
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
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              <div>
                                <label htmlFor={`arrival-time-${eventDate.id}`} className="block text-xs text-gray-600 mb-1">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Arrival
                                </label>
                                <input
                                  id={`arrival-time-${eventDate.id}`}
                                  name={`arrival-time-${eventDate.id}`}
                                  title="Arrival Time"
                                  type="time"
                                  value={dateTime.arrivalTime}
                                  onChange={(e) => handleUpdateDateTime(eventDate.id, 'arrivalTime', e.target.value)}
                                  className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
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

          {/* Pay Configuration - shown when staff is selected */}
          {selectedUserId && selectedUserPayInfo && (
            <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pay for this event
              </label>

              {selectedUserPayInfo.userType === 'white_label' ? (
                // White Label users: Always flat rate, just need amount
                <div>
                  <p className="text-xs text-gray-500 mb-2">White Label Partner - Flat rate per event</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={flatRateAmount}
                      onChange={(e) => setFlatRateAmount(e.target.value)}
                      placeholder="Enter flat rate amount"
                      className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        errors.flatRate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.flatRate && (
                    <p className="text-sm text-red-600 mt-1">{errors.flatRate}</p>
                  )}
                </div>
              ) : (
                // Staff users: Can choose default or flat rate
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="pay-default"
                      name="pay-type"
                      checked={payTypeOverride === 'default'}
                      onChange={() => setPayTypeOverride('default')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="pay-default" className="text-sm text-gray-700">
                      Use Default ({selectedUserPayInfo.payType === 'hourly'
                        ? `Hourly @ $${selectedUserPayInfo.payRate?.toFixed(2) || '0.00'}/hr`
                        : `Flat Rate @ $${selectedUserPayInfo.defaultFlatRate?.toFixed(2) || '0.00'}`
                      })
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="pay-flat"
                      name="pay-type"
                      checked={payTypeOverride === 'flat_rate'}
                      onChange={() => setPayTypeOverride('flat_rate')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="pay-flat" className="text-sm text-gray-700">
                      Flat Rate for this event
                    </label>
                  </div>

                  {payTypeOverride === 'flat_rate' && (
                    <div className="ml-7">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={flatRateAmount}
                          onChange={(e) => setFlatRateAmount(e.target.value)}
                          placeholder="Enter flat rate amount"
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                            errors.flatRate ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Flat rate events do not include mileage reimbursement.
                      </p>
                      {errors.flatRate && (
                        <p className="text-sm text-red-600 mt-1">{errors.flatRate}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
