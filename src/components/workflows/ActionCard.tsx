'use client'

/**
 * Action Card Component
 *
 * Department-categorized action configuration card
 * Supports:
 * - General: Create Task
 * - Design: Create Design Item
 */

import { useState, useEffect } from 'react'
import { Trash2, ClipboardCheck, Palette, User, Loader2, Info, Briefcase, UserPlus, Mail, Bell, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkflowBuilderAction, WorkflowActionType } from '@/types/workflows'
import { createLogger } from '@/lib/logger'

const log = createLogger('workflows')

interface TaskTemplate {
  id: string
  name: string
  default_title: string
  department: string
}

interface DesignItemType {
  id: string
  name: string
  type: 'digital' | 'physical'
  category: string
  default_design_days: number
  default_production_days: number
  default_shipping_days: number
  client_approval_buffer_days: number
}

interface OperationsItemType {
  id: string
  name: string
  description: string | null
  category: 'equipment' | 'staffing' | 'logistics' | 'venue' | 'setup' | 'other'
  due_date_days: number
  urgent_threshold_days: number
  missed_deadline_days: number
  is_auto_added: boolean
  is_active: boolean
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
  const [designItemTypes, setDesignItemTypes] = useState<DesignItemType[]>([])
  const [opsItemTypes, setOpsItemTypes] = useState<OperationsItemType[]>([])
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [designers, setDesigners] = useState<UserOption[]>([])
  const [opsTeam, setOpsTeam] = useState<UserOption[]>([])
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

      // Fetch design item types
      log.debug('Fetching design item types...')
      const designTypesRes = await fetch('/api/design/types')
      log.debug('Design types response status:', designTypesRes.status)

      if (designTypesRes.ok) {
        const designTypesData = await designTypesRes.json()
        const types = designTypesData.types || designTypesData.designTypes || designTypesData
        setDesignItemTypes(Array.isArray(types) ? types : [])
      } else {
        console.error('[ActionCard] Failed to fetch design types:', await designTypesRes.text())
      }

      // Fetch operations item types
      log.debug('Fetching operations item types...')
      const opsTypesRes = await fetch('/api/operations/types')
      if (opsTypesRes.ok) {
        const opsTypesData = await opsTypesRes.json()
        const types = opsTypesData.types || opsTypesData
        setOpsItemTypes(Array.isArray(types) ? types.filter((t: OperationsItemType) => t.is_active) : [])
      } else {
        console.error('[ActionCard] Failed to fetch operations types:', await opsTypesRes.text())
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
        console.error('[ActionCard] Failed to fetch staff roles:', await staffRolesRes.text())
      }

      // Fetch all users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(Array.isArray(usersData) ? usersData : [])

        // Filter users by department
        const allUsers = Array.isArray(usersData) ? usersData : []

        // Helper to get user's departments (checks array first, falls back to legacy singular)
        const getUserDepartments = (user: any): string[] => {
          if (user.departments && Array.isArray(user.departments) && user.departments.length > 0) {
            return user.departments
          }
          return user.department ? [user.department] : []
        }

        // Filter designers (users with 'design' department)
        setDesigners(allUsers.filter(u => {
          const depts = getUserDepartments(u)
          return depts.some(d => d.toLowerCase().includes('design'))
        }))
        // Filter operations team (users with 'operations' or 'ops' department)
        setOpsTeam(allUsers.filter(u => {
          const depts = getUserDepartments(u)
          return depts.some(d =>
            d.toLowerCase().includes('operations') ||
            d.toLowerCase().includes('ops')
          )
        }))
      }
    } catch (error) {
      log.error({ error }, 'Error fetching data')
      setTaskTemplates([])
      setDesignItemTypes([])
      setOpsItemTypes([])
      setStaffRoles([])
      setUsers([])
      setDesigners([])
      setOpsTeam([])
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = taskTemplates.find(t => t.id === action.taskTemplateId)
  const selectedDesignItemType = designItemTypes.find(d => d.id === action.designItemTypeId)
  const selectedOpsItemType = opsItemTypes.find(o => o.id === action.operationsItemTypeId)
  const selectedStaffRole = staffRoles.find(r => r.id === action.staffRoleId)
  const selectedUser = users.find(u => u.id === action.assignedToUserId)

  // Action type metadata
  const ACTION_TYPE_METADATA: Record<WorkflowActionType, {
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    department: string
  }> = {
    create_task: {
      label: 'Create Task',
      icon: ClipboardCheck,
      color: 'blue',
      department: 'General Tasks',
    },
    create_design_item: {
      label: 'Create Design Item',
      icon: Palette,
      color: 'purple',
      department: 'Design Department',
    },
    create_ops_item: {
      label: 'Create Operations Item',
      icon: Briefcase,
      color: 'amber',
      department: 'Operations Department',
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

  const metadata = ACTION_TYPE_METADATA[action.actionType]
  const Icon = metadata.icon

  // Calculate total timeline for design items
  const getTotalTimeline = (designType: DesignItemType) => {
    const total =
      designType.default_design_days +
      designType.default_production_days +
      designType.default_shipping_days +
      designType.client_approval_buffer_days
    return total
  }

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
                <option value="create_design_item">Create Design Item</option>
                <option value="create_ops_item">Create Operations Item</option>
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
              {/* Task Template Selection */}
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
                  {taskTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.default_title}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="mt-2 text-xs text-gray-500">
                    Department: {selectedTemplate.department} | Default: {selectedTemplate.default_title}
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

          {action.actionType === 'create_design_item' && (
            <>
              {/* Design Item Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Design Item Type *
                </label>
                <select
                  value={action.designItemTypeId || ''}
                  onChange={(e) => onUpdate({ designItemTypeId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select a design item type...</option>
                  {designItemTypes.map((designType) => (
                    <option key={designType.id} value={designType.id}>
                      {designType.name} ({designType.type})
                    </option>
                  ))}
                </select>
                {selectedDesignItemType && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800 space-y-1">
                        <div><strong>Type:</strong> {selectedDesignItemType.type}</div>
                        <div><strong>Category:</strong> {selectedDesignItemType.category}</div>
                        <div><strong>Total Timeline:</strong> {getTotalTimeline(selectedDesignItemType)} days before event</div>
                        <div className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-200">
                          • Design: {selectedDesignItemType.default_design_days} days<br />
                          • Approval Buffer: {selectedDesignItemType.client_approval_buffer_days} days
                          {selectedDesignItemType.type === 'physical' && (
                            <>
                              <br />• Production: {selectedDesignItemType.default_production_days} days<br />
                              • Shipping: {selectedDesignItemType.default_shipping_days} days
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Designer Assignment (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Designer (Optional)
                </label>
                <select
                  value={action.assignedToUserId || ''}
                  onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Unassigned (can be assigned later)</option>
                  {designers.length > 0 ? (
                    designers.map((designer) => (
                      <option key={designer.id} value={designer.id}>
                        {designer.first_name && designer.last_name
                          ? `${designer.first_name} ${designer.last_name}`
                          : designer.email}
                      </option>
                    ))
                  ) : (
                    <option disabled>No designers found</option>
                  )}
                  {/* Fallback: Show all users if no designers */}
                  {designers.length === 0 && users.length > 0 && (
                    <optgroup label="All Users">
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.email}
                          {user.department && ` (${user.department})`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {selectedUser && (
                  <div className="mt-2 text-xs text-gray-500">
                    {selectedUser.email}
                    {selectedUser.department && ` | Department: ${selectedUser.department}`}
                  </div>
                )}
              </div>

              {/* Design Item Preview */}
              {action.designItemTypeId && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start">
                    <Palette className="h-4 w-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-purple-800">
                      <strong>Will create:</strong> "{selectedDesignItemType?.name}" design item
                      {action.assignedToUserId && selectedUser && (
                        <> and assign to {selectedUser.first_name && selectedUser.last_name
                          ? `${selectedUser.first_name} ${selectedUser.last_name}`
                          : selectedUser.email}</>
                      )}
                      {!action.assignedToUserId && <> (unassigned)</>}
                      <div className="mt-1 pt-1 border-t border-purple-300 text-xs text-purple-700">
                        ⏱ Timeline will be auto-calculated from event date
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {action.actionType === 'create_ops_item' && (
            <>
              {/* Operations Item Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operations Item Type *
                </label>
                <select
                  value={action.operationsItemTypeId || ''}
                  onChange={(e) => onUpdate({ operationsItemTypeId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Select an operations type...</option>
                  {opsItemTypes.length > 0 ? (
                    opsItemTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.due_date_days} days before event)
                      </option>
                    ))
                  ) : (
                    <option disabled>No operations types configured. Go to Settings → Operations to add them.</option>
                  )}
                </select>
                {selectedOpsItemType && (
                  <div className="mt-2 text-xs text-gray-500">
                    Category: {selectedOpsItemType.category} | Due: {selectedOpsItemType.due_date_days} days before event
                    {selectedOpsItemType.description && <div className="mt-1">{selectedOpsItemType.description}</div>}
                  </div>
                )}
              </div>

              {/* Operations Team Assignment (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Operations Team Member (Optional)
                </label>
                <select
                  value={action.assignedToUserId || ''}
                  onChange={(e) => onUpdate({ assignedToUserId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="">Unassigned (can be assigned later)</option>
                  {opsTeam.length > 0 ? (
                    opsTeam.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name && member.last_name
                          ? `${member.first_name} ${member.last_name}`
                          : member.email}
                      </option>
                    ))
                  ) : (
                    <option disabled>No operations team found</option>
                  )}
                  {/* Fallback: Show all users if no ops team */}
                  {opsTeam.length === 0 && users.length > 0 && (
                    <optgroup label="All Users">
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.email}
                          {user.department && ` (${user.department})`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {selectedUser && (
                  <div className="mt-2 text-xs text-gray-500">
                    {selectedUser.email}
                    {selectedUser.department && ` | Department: ${selectedUser.department}`}
                  </div>
                )}
              </div>

              {/* Operations Info */}
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 space-y-1">
                    <div><strong>Operations items</strong> are automatically created when events are created.</div>
                    <div>Configure operations types in <strong>Settings → Operations</strong>.</div>
                  </div>
                </div>
              </div>

              {/* Operations Item Preview */}
              {action.operationsItemTypeId && selectedOpsItemType && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <Briefcase className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <strong>Will create:</strong> "{selectedOpsItemType.name}" operations item
                      {action.assignedToUserId && selectedUser && (
                        <> and assign to {selectedUser.first_name && selectedUser.last_name
                          ? `${selectedUser.first_name} ${selectedUser.last_name}`
                          : selectedUser.email}</>
                      )}
                      {!action.assignedToUserId && <> (unassigned)</>}
                      <div className="mt-1 pt-1 border-t border-amber-300 text-xs text-amber-700">
                        ⏱ Due {selectedOpsItemType.due_date_days} days before event
                      </div>
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
