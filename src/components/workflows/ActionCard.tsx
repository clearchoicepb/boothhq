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
import { Trash2, ClipboardCheck, Palette, User, Loader2, Info, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkflowBuilderAction, WorkflowActionType } from '@/types/workflows'

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
      console.log('[ActionCard] Fetching design item types...')
      const designTypesRes = await fetch('/api/design/types')
      console.log('[ActionCard] Design types response status:', designTypesRes.status)

      if (designTypesRes.ok) {
        const designTypesData = await designTypesRes.json()
        const types = designTypesData.types || designTypesData.designTypes || designTypesData
        setDesignItemTypes(Array.isArray(types) ? types : [])
      } else {
        console.error('[ActionCard] Failed to fetch design types:', await designTypesRes.text())
      }

      // Fetch operations item types
      console.log('[ActionCard] Fetching operations item types...')
      const opsTypesRes = await fetch('/api/operations/types')
      if (opsTypesRes.ok) {
        const opsTypesData = await opsTypesRes.json()
        const types = opsTypesData.types || opsTypesData
        setOpsItemTypes(Array.isArray(types) ? types.filter((t: OperationsItemType) => t.is_active) : [])
      } else {
        console.error('[ActionCard] Failed to fetch operations types:', await opsTypesRes.text())
      }

      // Fetch all users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(Array.isArray(usersData) ? usersData : [])

        // Filter users by department
        const allUsers = Array.isArray(usersData) ? usersData : []
        // Filter designers (users with 'design' department)
        setDesigners(allUsers.filter(u => u.department?.toLowerCase().includes('design')))
        // Filter operations team (users with 'operations' or 'ops' department)
        setOpsTeam(allUsers.filter(u =>
          u.department?.toLowerCase().includes('operations') ||
          u.department?.toLowerCase().includes('ops')
        ))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setTaskTemplates([])
      setDesignItemTypes([])
      setOpsItemTypes([])
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
                  assignedToUserId: null,
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
            >
              <optgroup label="General Tasks">
                <option value="create_task">Create Task</option>
              </optgroup>
              <optgroup label="Design Department">
                <option value="create_design_item">Create Design Item</option>
              </optgroup>
              <optgroup label="Operations Department">
                <option value="create_ops_item">Create Operations Item</option>
              </optgroup>
              {/* Future departments (grayed out) */}
              <optgroup label="Coming Soon" disabled>
                <option disabled>Sales Tasks</option>
                <option disabled>Accounting Tasks</option>
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
                    <option disabled>No designers found (assign anyone below)</option>
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
                    <option disabled>No operations team members found (assign anyone below)</option>
                  )}
                  {/* Always show all users as fallback option */}
                  {users.length > 0 && (
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
        </div>
      )}
    </div>
  )
}
