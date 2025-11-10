import { Plus, Trash2, ChevronDown, ChevronRight, Briefcase, Users as UsersIcon, User, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date-utils'

/**
 * Convert 24-hour time to 12-hour format
 * @param time24 - Time in 24-hour format (e.g., "18:00:00" or "18:00")
 * @returns Time in 12-hour format (e.g., "6:00 PM")
 */
function formatTime12Hour(time24: string | null | undefined): string {
  if (!time24) return '--:--'

  // Parse the time (handles both "HH:MM:SS" and "HH:MM" formats)
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const minute = minutes || '00'

  // Convert to 12-hour format
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12 // Convert 0 to 12 for midnight, 13+ to 1-12

  return `${hour12}:${minute} ${period}`
}

interface EventStaffListProps {
  staffAssignments: any[]
  users: any[]
  staffRoles: any[]
  eventDates: any[]
  loading: boolean
  isAddingStaff: boolean
  selectedUserId: string
  selectedStaffRoleId: string
  staffRole: string
  staffNotes: string
  selectedDateTimes: any[]
  operationsTeamExpanded: boolean
  eventStaffExpanded: boolean
  onToggleOperationsTeam: () => void
  onToggleEventStaff: () => void
  onUserChange: (userId: string) => void
  onRoleChange: (roleId: string) => void
  onStaffRoleChange: (role: string) => void
  onNotesChange: (notes: string) => void
  onDateTimeToggle: (dateTime: any) => void
  onAddStaff: () => void
  onRemoveStaff: (staffId: string) => void
  onStartAdding: () => void
  onCancelAdding: () => void
  canEdit: boolean
}

/**
 * Displays and manages staff assignments for an event
 * Includes operations team and event-specific staff
 */
export function EventStaffList({
  staffAssignments,
  users,
  staffRoles,
  eventDates,
  loading,
  isAddingStaff,
  selectedUserId,
  selectedStaffRoleId,
  staffRole,
  staffNotes,
  operationsTeamExpanded,
  eventStaffExpanded,
  onToggleOperationsTeam,
  onToggleEventStaff,
  onUserChange,
  onRoleChange,
  onNotesChange,
  onAddStaff,
  onRemoveStaff,
  onStartAdding,
  onCancelAdding,
  canEdit,
}: EventStaffListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const operationsStaff = staffAssignments.filter(s => !s.event_date_id && s.staff_roles?.type === 'operations')
  const eventStaff = staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff')

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Event Staffing</h2>
        {canEdit && (
          <Button onClick={onStartAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Assign Staff
          </Button>
        )}
      </div>

      {/* Add Staff Form */}
      {isAddingStaff && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-[#347dc4]">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Assign New Staff Member</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
              <select
                value={selectedUserId}
                onChange={(e) => onUserChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
              >
                <option value="">Select a staff member...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={selectedStaffRoleId}
                onChange={(e) => onRoleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
              >
                <option value="">Select a role...</option>
                {staffRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={staffNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                placeholder="Add any notes about this assignment..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={onAddStaff}>
                Add Staff Member
              </Button>
              <Button variant="outline" onClick={onCancelAdding}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Operations Team Section */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={onToggleOperationsTeam}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {operationsTeamExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <Briefcase className="h-5 w-5 text-[#347dc4]" />
              <h3 className="text-md font-semibold text-gray-900">Operations Team</h3>
              <span className="text-sm text-gray-500">({operationsStaff.length})</span>
            </div>
          </button>
          {operationsTeamExpanded && (
            <div className="p-4 pt-0 border-t border-gray-200">
              {operationsStaff.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Briefcase className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No operations team members assigned</p>
                  <p className="text-xs text-gray-400 mt-1">Operations roles are for pre-event planning</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {operationsStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {staff.users ? `${staff.users.first_name} ${staff.users.last_name}` : 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">{staff.staff_roles?.name}</p>
                          {staff.notes && (
                            <p className="text-xs text-gray-600 mt-1">{staff.notes}</p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveStaff(staff.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Staff Section */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={onToggleEventStaff}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {eventStaffExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <UsersIcon className="h-5 w-5 text-[#347dc4]" />
              <h3 className="text-md font-semibold text-gray-900">Event Staff</h3>
              <span className="text-sm text-gray-500">({eventStaff.length})</span>
            </div>
          </button>
          {eventStaffExpanded && (
            <div className="p-4 pt-0 border-t border-gray-200">
              {eventStaff.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <UsersIcon className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No event staff assigned</p>
                  <p className="text-xs text-gray-400 mt-1">Event roles are for day-of execution</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 flex-1">
                        <User className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {staff.users ? `${staff.users.first_name} ${staff.users.last_name}` : 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">{staff.staff_roles?.name}</p>

                          {/* Date and Time Display */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                            {staff.event_dates && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {formatDate(staff.event_dates.event_date, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                            {(staff.start_time || staff.end_time) && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTime12Hour(staff.start_time)} - {formatTime12Hour(staff.end_time)}
                                </span>
                              </div>
                            )}
                          </div>

                          {staff.notes && (
                            <p className="text-xs text-gray-600 mt-1">{staff.notes}</p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveStaff(staff.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

