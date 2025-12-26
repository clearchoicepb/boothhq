'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils/date-utils'
import { formatDistance, getDistanceColorClass } from '@/lib/utils/distance-utils'
import { useStaffDistance, DISTANCE_FILTER_OPTIONS, type DistanceFilterValue, type StaffSortOption } from '@/hooks/useStaffDistance'
import { MapPin, Clock } from 'lucide-react'
import type { EventDate } from '@/types/events'

interface StaffRole {
  id: string
  name: string
  type: 'operations' | 'event_staff'
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

interface EventLocation {
  latitude: number | null
  longitude: number | null
  name?: string
}

interface DateTimeSelection {
  dateId: string
  arrivalTime: string
  startTime: string
  endTime: string
}

interface AssignStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  editingStaffId: string | null
  selectedUserId: string
  setSelectedUserId: (id: string) => void
  selectedStaffRoleId: string
  setSelectedStaffRoleId: (id: string) => void
  selectedDateTimes: DateTimeSelection[]
  setSelectedDateTimes: (dates: DateTimeSelection[]) => void
  staffNotes: string
  setStaffNotes: (notes: string) => void
  users: User[]
  staffRoles: StaffRole[]
  eventDates: EventDate[]
  /** Optional event location for distance calculation */
  eventLocation?: EventLocation | null
  // Payroll props
  payTypeOverride: 'default' | 'flat_rate'
  setPayTypeOverride: (value: 'default' | 'flat_rate') => void
  flatRateAmount: string
  setFlatRateAmount: (value: string) => void
}

export function AssignStaffModal({
  isOpen,
  onClose,
  onSubmit,
  editingStaffId,
  selectedUserId,
  setSelectedUserId,
  selectedStaffRoleId,
  setSelectedStaffRoleId,
  selectedDateTimes,
  setSelectedDateTimes,
  staffNotes,
  setStaffNotes,
  users,
  staffRoles,
  eventDates,
  eventLocation,
  payTypeOverride,
  setPayTypeOverride,
  flatRateAmount,
  setFlatRateAmount
}: AssignStaffModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get selected user's pay info
  const selectedUserPayInfo = useMemo(() => {
    if (!selectedUserId) return null
    const user = users.find(u => u.id === selectedUserId)
    if (!user) return null

    return {
      userType: (user.user_type as 'staff' | 'white_label') || 'staff',
      payType: (user.pay_type as 'hourly' | 'flat_rate') || 'hourly',
      payRate: user.pay_rate ?? null,
      defaultFlatRate: user.default_flat_rate ?? null
    }
  }, [selectedUserId, users])

  // Use staff distance hook for distance calculations
  const {
    displayUsers,
    locationHasCoordinates,
    maxDistance,
    setMaxDistance,
    sortBy,
    setSortBy,
  } = useStaffDistance(users, { location: eventLocation })

  const selectedRole = staffRoles.find(r => r.id === selectedStaffRoleId)
  const isEventStaffRole = selectedRole?.type === 'event_staff'

  // Clear errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrors({})
    }
  }, [isOpen])

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedUserId) {
      newErrors.user = 'Please select a staff member'
    }

    if (!selectedStaffRoleId) {
      newErrors.role = 'Please select a staff role'
    }

    if (isEventStaffRole && selectedDateTimes.length === 0) {
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

  const handleSubmitWithValidation = () => {
    if (validateForm()) {
      onSubmit()
    }
  }

  // Check if form is valid for button state
  const isFormValid = selectedUserId && selectedStaffRoleId && (!isEventStaffRole || selectedDateTimes.length > 0)

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
    // Clear dates error when user makes a selection
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

  const handleRoleChange = (roleId: string) => {
    // Clear role error when user makes a selection
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }))
    }

    setSelectedStaffRoleId(roleId)
    const role = staffRoles.find(r => r.id === roleId)
    if (role?.type === 'operations') {
      setSelectedDateTimes([])
    }
  }

  const handleUserChange = (userId: string) => {
    // Clear user error when user makes a selection
    if (errors.user) {
      setErrors(prev => ({ ...prev, user: '' }))
    }
    setSelectedUserId(userId)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingStaffId ? 'Edit Staff Assignment' : 'Assign Staff Member'}
      className="sm:max-w-md"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* User Selection */}
        <div>
          <label htmlFor="staff-member-select" className="block text-sm font-medium text-gray-700 mb-2">
            Staff Member <span className="text-red-500">*</span>
          </label>

          {/* Distance Filter & Sort Controls - only show if location has coordinates */}
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
            onChange={(e) => handleUserChange(e.target.value)}
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
          {selectedUserId && locationHasCoordinates && (() => {
            const selectedUser = displayUsers.find(u => u.id === selectedUserId)
            if (selectedUser?.distance != null) {
              return (
                <div className={`flex items-center gap-1 mt-1 text-xs ${getDistanceColorClass(selectedUser.distance)}`}>
                  <MapPin className="h-3 w-3" />
                  <span>{formatDistance(selectedUser.distance)} from event location</span>
                </div>
              )
            }
            return null
          })()}

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
            onChange={(e) => handleRoleChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Select Role --</option>
            <optgroup label="Operations Team">
              {staffRoles.filter(r => r.type === 'operations').map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Event Staff">
              {staffRoles.filter(r => r.type === 'event_staff').map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </optgroup>
          </select>
          {errors.role && (
            <p className="text-sm text-red-600 mt-1">{errors.role}</p>
          )}
          {selectedStaffRoleId && !errors.role && (
            <p className="text-xs text-gray-500 mt-1">
              {selectedRole?.type === 'operations'
                ? 'Operations roles are assigned to the overall event'
                : 'Event Staff roles must be assigned to specific event dates'}
            </p>
          )}
        </div>

        {/* Event Dates Selection - Only show for event_staff roles */}
        {isEventStaffRole && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Event Dates & Times *</label>
            <p className="text-xs text-gray-500 mb-3">
              Select dates to schedule this staff member. Times auto-populate from event and can be adjusted.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
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
                          {formatDate(eventDate.event_date, {
                            weekday: 'long',
                            month: 'long',
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
            {errors.dates && (
              <p className="text-sm text-red-600 mt-2">{errors.dates}</p>
            )}
          </div>
        )}

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
            Notes
          </label>
          <textarea
            id="staff-notes"
            name="staff-notes"
            title="Staff Notes"
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Any assignment-specific notes or instructions..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmitWithValidation}
          disabled={!isFormValid}
          className={!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {editingStaffId ? 'Update Assignment' : 'Assign Staff'}
        </Button>
      </div>
    </Modal>
  )
}


