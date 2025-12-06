import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, User, Edit, X, CheckCircle } from "lucide-react"
import { EventStatusBadge } from "./event-status-badge"
import { formatDate, formatTime, toDateInputValue } from "@/lib/utils/date-utils"
import { Modal } from "@/components/ui/modal"
import type { EventDate, EventDateLocation, EditableEventDate } from '@/types/events'

type EventStaffAssignment = {
  id: string
  event_date_id: string
  role?: string | null
  users?: {
    first_name?: string | null
    last_name?: string | null
    name?: string | null
  }
}

interface EventDateDetailModalProps {
  eventDate: EventDate | null
  isOpen: boolean
  isEditing: boolean
  editEventDateData: EditableEventDate
  locations: EventDateLocation[]
  staffAssignments: EventStaffAssignment[]
  onClose: () => void
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onFieldChange: (field: keyof EditableEventDate, value: string) => void
  canEdit: boolean
}

export function EventDateDetailModal({
  eventDate,
  isOpen,
  isEditing,
  editEventDateData,
  locations,
  staffAssignments,
  onClose,
  onStartEdit,
  onSave,
  onCancel,
  onFieldChange,
  canEdit
}: EventDateDetailModalProps) {
  if (!eventDate) return null

  const handleClose = () => {
    onClose()
    if (isEditing) {
      onCancel()
    }
  }

  const headerTitle = formatDate(eventDate.event_date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const staffForDate = staffAssignments.filter((assignment) => assignment.event_date_id === eventDate.id)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={headerTitle} className="sm:max-w-3xl">
      <div className="flex max-h-[80vh] flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <p className="text-sm text-gray-500">Event Date Details</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={onStartEdit}
                className="p-2 text-gray-400 transition-colors hover:text-blue-600"
                title="Edit event date"
              >
                <Edit className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close event date details"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="mt-6 flex-1 overflow-y-auto space-y-6">
          <section>
            <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-date-input">
              Event Date
            </label>
            {isEditing ? (
              <input
                id="event-date-input"
                name="event_date"
                title="Event Date"
                type="date"
                value={toDateInputValue(editEventDateData.event_date || eventDate.event_date)}
                onChange={(e) => onFieldChange('event_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-gray-400" />
                <span className="text-base text-gray-900">{headerTitle}</span>
              </div>
            )}
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-status-select">
              Status
            </label>
            {isEditing ? (
              <select
                id="event-status-select"
                name="status"
                title="Status"
                value={editEventDateData.status || ''}
                onChange={(e) => onFieldChange('status', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : (
              <EventStatusBadge status={eventDate.status} />
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-setup-time">
                Setup Time
              </label>
              {isEditing ? (
                <input
                  id="event-setup-time"
                  name="setup_time"
                  title="Setup Time"
                  type="time"
                  value={editEventDateData.setup_time || ''}
                  onChange={(e) => onFieldChange('setup_time', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : eventDate.setup_time ? (
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-gray-400" />
                  <span className="text-base text-gray-900">{formatTime(eventDate.setup_time)}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">Not set</span>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-start-time">
                Start Time
              </label>
              {isEditing ? (
                <input
                  id="event-start-time"
                  name="start_time"
                  title="Start Time"
                  type="time"
                  value={editEventDateData.start_time || ''}
                  onChange={(e) => onFieldChange('start_time', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : eventDate.start_time ? (
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-gray-400" />
                  <span className="text-base text-gray-900">{formatTime(eventDate.start_time)}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">Not set</span>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-end-time">
                End Time
              </label>
              {isEditing ? (
                <input
                  id="event-end-time"
                  name="end_time"
                  title="End Time"
                  type="time"
                  value={editEventDateData.end_time || ''}
                  onChange={(e) => onFieldChange('end_time', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : eventDate.end_time ? (
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-gray-400" />
                  <span className="text-base text-gray-900">{formatTime(eventDate.end_time)}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">Not set</span>
              )}
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-location-select">
              Location
            </label>
            {isEditing ? (
              <select
                id="event-location-select"
                name="location_id"
                title="Location"
                value={editEventDateData.location_id || ''}
                onChange={(e) => onFieldChange('location_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Location --</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            ) : eventDate.locations ? (
              <div>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-gray-400" />
                  <span className="text-base text-gray-900">{eventDate.locations.name}</span>
                </div>
                {eventDate.locations.address_line1 && (
                  <div className="ml-7 mt-1 text-sm text-gray-600">
                    {eventDate.locations.address_line1}
                    {eventDate.locations.city && `, ${eventDate.locations.city}`}
                    {eventDate.locations.state && `, ${eventDate.locations.state}`}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500">Not set</span>
            )}
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-gray-500" htmlFor="event-notes-textarea">
              Notes
            </label>
            {isEditing ? (
              <textarea
                id="event-notes-textarea"
                name="notes"
                title="Notes"
                value={editEventDateData.notes || ''}
                onChange={(e) => onFieldChange('notes', e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add notes about this event date..."
              />
            ) : eventDate.notes ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-900">{eventDate.notes}</p>
              </div>
            ) : (
              <span className="text-sm text-gray-500">No notes</span>
            )}
          </section>

          {!isEditing && (
            <section className="space-y-2 border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-500">Assigned Staff</p>
              {staffForDate.length === 0 ? (
                <p className="text-sm italic text-gray-500">No staff assigned to this date</p>
              ) : (
                staffForDate.map((staff) => {
                  const userName = staff.users?.name ||
                                   (staff.users?.first_name && staff.users?.last_name
                                     ? `${staff.users.first_name} ${staff.users.last_name}`.trim()
                                     : staff.users?.first_name || staff.users?.last_name || 'Unknown User')

                  return (
                    <div key={staff.id} className="flex items-center gap-2 rounded-md bg-gray-50 p-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{userName}</p>
                        {staff.role && <p className="text-xs text-gray-600">{staff.role}</p>}
                      </div>
                    </div>
                  )
                })
              )}
            </section>
          )}

          <section className="border-t border-gray-200 pt-4">
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-500">Event Date ID:</span>{' '}
              <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {eventDate.id}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {formatDate(eventDate.created_at || eventDate.event_date)}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {formatDate(eventDate.updated_at || eventDate.event_date)}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-6 flex justify-end gap-3">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="button" onClick={onSave} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </footer>
      </div>
    </Modal>
  )
}

