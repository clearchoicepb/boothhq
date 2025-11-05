import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, User, Edit, X, CheckCircle } from "lucide-react"
import { EventStatusBadge } from "./event-status-badge"
import { formatDate, toDateInputValue } from "@/lib/utils/date-utils"
import { Modal } from "@/components/ui/modal"

interface EventDateDetailModalProps {
  eventDate: any | null
  isOpen: boolean
  isEditing: boolean
  editEventDateData: any
  locations: any[]
  staffAssignments: any[]
  onClose: () => void
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onFieldChange: (field: string, value: any) => void
  canEdit: boolean
}

/**
 * Modal for viewing and editing event date details
 * Includes date/time, location, status, notes, and staff assignments
 */
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={formatDate(eventDate.event_date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
      className="sm:max-w-3xl"
    >
      <div className="flex max-h-[80vh] flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <p className="text-sm text-gray-500">Event Date Details</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && canEdit && (
              <button
                onClick={onStartEdit}
                className="p-2 text-gray-400 transition-colors hover:text-blue-600"
                title="Edit event date"
              >
                <Edit className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close event date details"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto space-y-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Event Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={toDateInputValue(editEventDateData.event_date || eventDate.event_date)}
                  onChange={(e) => onFieldChange('event_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              ) : (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-base text-gray-900">
                    {formatDate(eventDate.event_date, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Status</label>
              {isEditing ? (
                <select
                  value={editEventDateData.status || ''}
                  onChange={(e) => onFieldChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <EventStatusBadge status={eventDate.status} />
              )}
            </div>

            {/* Time Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Start Time</label>
                {isEditing ? (
                  <input
                    type="time"
                    value={editEventDateData.start_time || ''}
                    onChange={(e) => onFieldChange('start_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                ) : eventDate.start_time ? (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-base text-gray-900">{eventDate.start_time}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Not set</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">End Time</label>
                {isEditing ? (
                  <input
                    type="time"
                    value={editEventDateData.end_time || ''}
                    onChange={(e) => onFieldChange('end_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                ) : eventDate.end_time ? (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-base text-gray-900">{eventDate.end_time}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Not set</span>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Location</label>
              {isEditing ? (
                <select
                  value={editEventDateData.location_id || ''}
                  onChange={(e) => onFieldChange('location_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">-- Select Location --</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              ) : eventDate.locations ? (
                <div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-base text-gray-900">{eventDate.locations.name}</span>
                  </div>
                  {eventDate.locations.address_line1 && (
                    <div className="mt-1 ml-7 text-sm text-gray-600">
                      {eventDate.locations.address_line1}
                      {eventDate.locations.city && `, ${eventDate.locations.city}`}
                      {eventDate.locations.state && `, ${eventDate.locations.state}`}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-500">Not set</span>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
              {isEditing ? (
                <textarea
                  value={editEventDateData.notes || ''}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Add notes about this event date..."
                />
              ) : eventDate.notes ? (
                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{eventDate.notes}</p>
                </div>
              ) : (
                <span className="text-sm text-gray-500">No notes</span>
              )}
            </div>

            {/* Assigned Staff */}
            {!isEditing && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-500 mb-3">Assigned Staff</label>
                {(() => {
                  const dateStaff = staffAssignments.filter(s => s.event_date_id === eventDate.id)
                  return dateStaff.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No staff assigned to this date</p>
                  ) : (
                    <div className="space-y-2">
                      {dateStaff.map((staff) => (
                        <div key={staff.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{staff.users?.name || 'Unknown User'}</p>
                            {staff.role && (
                              <p className="text-xs text-gray-600">{staff.role}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Date Created/Updated */}
            <div className="pt-4 border-t border-gray-200">
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
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

