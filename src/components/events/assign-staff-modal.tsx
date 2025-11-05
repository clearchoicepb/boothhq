'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date-utils'

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
}

interface EventDate {
  id: string
  event_date: string
  start_time?: string
  end_time?: string
}

interface DateTimeSelection {
  dateId: string
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
  eventDates
}: AssignStaffModalProps) {
  const selectedRole = staffRoles.find(r => r.id === selectedStaffRoleId)
  const isEventStaffRole = selectedRole?.type === 'event_staff'

  const handleToggleDate = (dateId: string, checked: boolean) => {
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

  const handleRoleChange = (roleId: string) => {
    setSelectedStaffRoleId(roleId)
    const role = staffRoles.find(r => r.id === roleId)
    if (role?.type === 'operations') {
      setSelectedDateTimes([])
    }
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
            Staff Member *
          </label>
          <select
            id="staff-member-select"
            name="staff-member"
            title="Staff Member"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">-- Select User --</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} {user.email ? `(${user.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Role Selection */}
        <div>
          <label htmlFor="staff-role-select" className="block text-sm font-medium text-gray-700 mb-2">
            Staff Role *
          </label>
          <select
            id="staff-role-select"
            name="staff-role"
            title="Staff Role"
            value={selectedStaffRoleId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
          {selectedStaffRoleId && (
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
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor={`start-time-${eventDate.id}`} className="block text-xs text-gray-600 mb-1">
                                Start Time
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
                                End Time
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
            {selectedDateTimes.length === 0 && (
              <p className="text-xs text-red-600 mt-2">Please select at least one event date</p>
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
        <Button onClick={onSubmit}>
          Assign Staff
        </Button>
      </div>
    </Modal>
  )
}

