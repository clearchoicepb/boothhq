'use client'

/**
 * Action Card Component
 *
 * Department-categorized action configuration card
 * Supports:
 * - Create Task (organized by department)
 * - Assign Event Role
 * - Communication actions (email, notification)
 */

import { useState, useEffect, useMemo } from 'react'
import { Trash2, ClipboardCheck, User, Loader2, Info, UserPlus, Mail, Bell, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkflowBuilderAction, WorkflowActionType } from '@/types/workflows'
import { DEPARTMENTS, type DepartmentId } from '@/lib/departments'
import { createLogger } from '@/lib/logger'

const log = createLogger('workflows')

interface TaskTemplate {
  id: string
  name: string
  default_title: string
  department: string
  task_type: string | null
}

interface UserOption {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  department: string | null
}

interface StaffRole {
  id: string
  name: string
  type: 'operations' | 'event_staff'
  is_active: boolean
}

interface ActionCardProps {
  action: WorkflowBuilderAction
  index: number
  onUpdate: (updated: Partial<WorkflowBuilderAction>) => void
  onDelete: () => void
}

export default function ActionCard({ action, index, onUpdate, onDelete }: ActionCardProps) {
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch task templates
      const templatesRes = await fetch('/api/task-templates')
      if (templatesRes.ok) {
        const templates = await templatesRes.json()
        setTaskTemplates(Array.isArray(templates) ? templates : [])
      }

      // Fetch staff roles (for assign_event_role actions)
      log.debug('Fetching staff roles...')
      const staffRolesRes = await fetch('/api/staff-roles')
      if (staffRolesRes.ok) {
        const staffRolesData = await staffRolesRes.json()
        // Filter to only active operations roles (event-level assignments)
        const roles = Array.isArray(staffRolesData) ? staffRolesData : (staffRolesData.roles || [])
        setStaffRoles(roles.filter((r: StaffRole) => r.is_active && r.type === 'operations'))
      } else {
        log.error({ response: await staffRolesRes.text() }, 'Failed to fetch staff roles')
      }

      // Fetch all users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(Array.isArray(usersData) ? usersData : [])
      }
    } catch (error) {
      log.error({ error }, 'Error fetching data')
      setTaskTemplates([])
      setStaffRoles([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Group task templates by department for organized dropdown
  const templatesByDepartment = useMemo(() => {
    const grouped: Record<string, TaskTemplate[]> = {}
    taskTemplates.forEach(template => {
      const dept = template.department || 'other'
      if (!grouped[dept]) grouped[dept] = []
      grouped[dept].push(template)
    })
    // Sort by department display order
    const sortedDepts = Object.keys(grouped).sort((a, b) => {
      const deptA = DEPARTMENTS[a as DepartmentId]
      const deptB = DEPARTMENTS[b as DepartmentId]
      if (!deptA) return 1
      if (!deptB) return -1
      return deptA.name.localeCompare(deptB.name)
    })
    return sortedDepts.map(dept => ({
      department: dept,
      name: DEPARTMENTS[dept as DepartmentId]?.name || dept,
      templates: grouped[dept]
    }))
  }, [taskTemplates])

  const selectedTemplate = taskTemplates.find(t => t.id === action.taskTemplateId)
  const selectedStaffRole = staffRoles.find(r => r.id === action.staffRoleId)
  const selectedUser = users.find(u => u.id === action.assignedToUserId)

  // Action type metadata (only active action types)
  const ACTION_TYPE_METADATA: Partial<Record<WorkflowActionType, {
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    department: string
  }>> = {
    create_task: {
      label: 'Create Task',
      icon: ClipboardCheck,
      color: 'blue',
      department: 'General Tasks',
    },
    assign_event_role: {
      label: 'Assign Event Role',
      icon: UserPlus,
      color: 'green',
      department: 'Staff Assignment',
    },
    assign_task: {
      label: 'Assign Task',
      icon: UserCheck,
      color: 'teal',
      department: 'Task Assignment',
    },
    send_email: {
      label: 'Send Email',
      icon: Mail,
      color: 'indigo',
      department: 'Communication',
    },
    send_notification: {
      label: 'Send Notification',
      icon: Bell,
      color: 'pink',
      department: 'Communication',
    },
  }

  const metadata = ACTION_TYPE_METADATA[action.actionType] || {
    label: action.actionType,
    icon: ClipboardCheck,
    color: 'gray',
    department: 'Unknown',
  }
  const Icon = metadata.icon

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-${metadata.color}-100 text-${metadata.color}-600 mr-3`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{metadata.department}</div>
            <h4 className="text-sm font-medium text-gray-900">{metadata.label}</h4>
            <p className="text-xs text-gray-500">Action {index + 1}</p>
          </div>
        </div>
        <Button
          onClick={onDelete}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:border-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#347dc4]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Type *
            </label>
            <select
              value={action.actionType}
              onChange={(e) => {
                const newType = e.target.value as WorkflowActionType
                onUpdate({
                  actionType: newType,
                  taskTemplateId: null,
                  designItemTypeId: null,
                  operationsItemTypeId: null,
                  staffRoleId: null,
                  assignedToUserId: null,
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
            >
              <optgroup label="Creation Actions">
                <option value="create_task">Create Task</option>
              </optgroup>
              <optgroup label="Assignment Actions">
                <option value="assign_event_role">Assign Event Role</option>
                <option value="assign_task">Assign Task (for task triggers)</option>
              </optgroup>
              <optgroup label="Communication Actions">
                <option value="send_email">Send Email</option>
                <option value="send_notification">Send Notification</option>
              </optgroup>
            </select>
          </div>

          {/* Conditional Fields based on Action Type */}
          {action.actionType === 'create_task' && (
            <>
              {/* Task Template Selection - Organized by Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Template *
                </label>
                <select
                  value={action.taskTemplateId || ''}
                  onChange={(e) => onUpdate({ taskTemplateId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a task template...</option>
                  {templatesByDepartment.map(({ department, name, templates }) => (
                    <optgroup key={department} label={name}>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.default_title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="mt-2 text-xs text-gray-500">
                    Department: {DEPARTMENTS[selectedTemplate.department as DepartmentId]?.name || selectedTemplate.department} |
                    Default: {selectedTemplate.default_title}
                  </div>
                )}
              </div>

              {/* Assigned User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To *
                </label>
                <select
                  value={action.assignedToUserId || ''}
                  onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                      {user.department && ` (${user.department})`}
                    </option>
                  ))}
                </select>
                {selectedUser && (
                  <div className="mt-2 text-xs text-gray-500">
                    Email: {selectedUser.email}
                    {selectedUser.department && ` | Department: ${selectedUser.department}`}
                  </div>
                )}
              </div>

              {/* Task Preview */}
              {action.taskTemplateId && action.assignedToUserId && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <ClipboardCheck className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-green-800">
                      <strong>Will create:</strong> "{selectedTemplate?.default_title}" 
                      and assign to {selectedUser?.first_name && selectedUser?.last_name
                        ? `${selectedUser.first_name} ${selectedUser.last_name}`
                        : selectedUser?.email}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {action.actionType === 'assign_event_role' && (
            <>
              {/* Staff Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Role *
                </label>
                <select
                  value={action.staffRoleId || ''}
                  onChange={(e) => onUpdate({ staffRoleId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a staff role...</option>
                  {staffRoles.length > 0 ? (
                    staffRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No operations roles configured. Go to Settings → Staff Roles to add them.</option>
                  )}
                </select>
                {selectedStaffRole && (
                  <div className="mt-2 text-xs text-gray-500">
                    Type: {selectedStaffRole.type === 'operations' ? 'Operations (event-level)' : 'Event Staff (date-specific)'}
                  </div>
                )}
              </div>

              {/* User Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign User *
                </label>
                <select
                  value={action.assignedToUserId || ''}
                  onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a user to assign...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                      {user.department && ` (${user.department})`}
                    </option>
                  ))}
                </select>
                {selectedUser && (
                  <div className="mt-2 text-xs text-gray-500">
                    Email: {selectedUser.email}
                    {selectedUser.department && ` | Department: ${selectedUser.department}`}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-green-800 space-y-1">
                    <div><strong>Event role assignments</strong> automatically assign a staff member to a role when the event is created.</div>
                    <div>Configure staff roles in <strong>Settings → Staff Roles</strong>.</div>
                  </div>
                </div>
              </div>

              {/* Assignment Preview */}
              {action.staffRoleId && action.assignedToUserId && selectedStaffRole && selectedUser && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <UserPlus className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-green-800">
                      <strong>Will assign:</strong> {selectedUser.first_name && selectedUser.last_name
                        ? `${selectedUser.first_name} ${selectedUser.last_name}`
                        : selectedUser.email} as <strong>{selectedStaffRole.name}</strong> for this event
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────────────────
              ASSIGN TASK ACTION (Phase 4)
              ───────────────────────────────────────────────────────────────────────── */}
          {action.actionType === 'assign_task' && (
            <>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg mb-4">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-teal-800">
                    <strong>Note:</strong> This action only works with task triggers (task_created, task_status_changed).
                    It will assign the specified user to the triggering task.
                  </div>
                </div>
              </div>

              {/* User Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To *
                </label>
                <select
                  value={action.assignedToUserId || ''}
                  onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                      {user.department && ` (${user.department})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {action.assignedToUserId && selectedUser && (
                <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-start">
                    <UserCheck className="h-4 w-4 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-teal-800">
                      <strong>Will assign:</strong> {selectedUser.first_name && selectedUser.last_name
                        ? `${selectedUser.first_name} ${selectedUser.last_name}`
                        : selectedUser.email} to the triggering task
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────────────────
              SEND EMAIL ACTION (Phase 4)
              ───────────────────────────────────────────────────────────────────────── */}
          {action.actionType === 'send_email' && (
            <>
              {/* Recipient Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send To *
                </label>
                <select
                  value={action.config?.recipient_type || ''}
                  onChange={(e) => onUpdate({
                    config: {
                      ...action.config,
                      recipient_type: e.target.value || null,
                      custom_email: e.target.value === 'custom' ? action.config?.custom_email : null,
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select recipient type...</option>
                  <option value="assigned_user">Assigned User (select below)</option>
                  <option value="event_contact">Event Contact (from account)</option>
                  <option value="custom">Custom Email Address</option>
                </select>
              </div>

              {/* Assigned User Selection */}
              {action.config?.recipient_type === 'assigned_user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User *
                  </label>
                  <select
                    value={action.assignedToUserId || ''}
                    onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.email}
                        {user.department && ` (${user.department})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Email Input */}
              {action.config?.recipient_type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={action.config?.custom_email || ''}
                    onChange={(e) => onUpdate({
                      config: { ...action.config, custom_email: e.target.value }
                    })}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                  />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={action.config?.subject || ''}
                  onChange={(e) => onUpdate({
                    config: { ...action.config, subject: e.target.value }
                  })}
                  placeholder="Email subject (optional, uses template default)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Body
                </label>
                <textarea
                  value={action.config?.body || ''}
                  onChange={(e) => onUpdate({
                    config: { ...action.config, body: e.target.value }
                  })}
                  placeholder="Email body (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                />
              </div>

              {/* Info */}
              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-indigo-800">
                    <strong>Note:</strong> Email sending requires email service integration (Resend, SendGrid, etc.).
                    Currently logs email details and marks as queued.
                  </div>
                </div>
              </div>

              {/* Preview */}
              {action.config?.recipient_type && (
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-start">
                    <Mail className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-indigo-800">
                      <strong>Will send email to:</strong>{' '}
                      {action.config.recipient_type === 'assigned_user' && selectedUser && (
                        <>{selectedUser.email}</>
                      )}
                      {action.config.recipient_type === 'event_contact' && (
                        <>Event contact from account</>
                      )}
                      {action.config.recipient_type === 'custom' && action.config.custom_email && (
                        <>{action.config.custom_email}</>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────────────────
              SEND NOTIFICATION ACTION (Phase 4)
              ───────────────────────────────────────────────────────────────────────── */}
          {action.actionType === 'send_notification' && (
            <>
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send To *
                </label>
                <select
                  value={action.assignedToUserId || ''}
                  onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                      {user.department && ` (${user.department})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notification Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={action.config?.title || ''}
                  onChange={(e) => onUpdate({
                    config: { ...action.config, title: e.target.value }
                  })}
                  placeholder="Notification title (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={action.config?.message || ''}
                  onChange={(e) => onUpdate({
                    config: { ...action.config, message: e.target.value }
                  })}
                  placeholder="Notification message..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={action.config?.priority || 'normal'}
                  onChange={(e) => onUpdate({
                    config: { ...action.config, priority: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Preview */}
              {action.assignedToUserId && selectedUser && (
                <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <div className="flex items-start">
                    <Bell className="h-4 w-4 text-pink-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-pink-800">
                      <strong>Will notify:</strong> {selectedUser.first_name && selectedUser.last_name
                        ? `${selectedUser.first_name} ${selectedUser.last_name}`
                        : selectedUser.email}
                      {action.config?.message && (
                        <>
                          <div className="mt-1 pt-1 border-t border-pink-200 text-pink-700 italic">
                            "{action.config.message.slice(0, 50)}{action.config.message.length > 50 ? '...' : ''}"
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
