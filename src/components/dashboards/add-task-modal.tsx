'use client'

/**
 * Add Task Modal Component
 *
 * Quick task creation modal for department dashboards
 * Pre-populates department context and shows department-specific task types
 * Supports unified task type selection and template filtering
 */

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTask, useCreateTaskFromTemplate } from '@/hooks/useTaskActions'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import { useUsers } from '@/hooks/useUsers'
import { DEPARTMENTS, DEPARTMENT_TASK_TYPES, type DepartmentId } from '@/lib/departments'
import { Plus, FileText, Loader2, Users } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import type { UnifiedTaskType } from '@/types/tasks'

const log = createLogger('dashboards')

// User type for filtering
interface UserWithDepartments {
  id: string
  first_name: string
  last_name: string
  email: string
  departments?: string[] | null
  department?: string | null // Legacy field
}

// Display labels for unified task types
const UNIFIED_TASK_TYPE_LABELS: Record<UnifiedTaskType, string> = {
  general: 'General',
  design: 'Design',
  operations: 'Operations',
  sales: 'Sales',
  admin: 'Admin',
  project: 'Project',
  misc: 'Miscellaneous',
}

// All unified task types in order
const UNIFIED_TASK_TYPES: UnifiedTaskType[] = [
  'general',
  'design',
  'operations',
  'sales',
  'admin',
  'project',
  'misc',
]

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  departmentId: DepartmentId
  userId?: string
  primaryColor: string
  /** Default unified task type - when set, pre-selects this type */
  defaultTaskType?: UnifiedTaskType
  /** If true, hides the task type selector (useful for contextual task creation) */
  hideTaskTypeSelector?: boolean
  /** Optional entity context for linking tasks */
  entityType?: string
  entityId?: string
}

export function AddTaskModal({
  isOpen,
  onClose,
  departmentId,
  userId,
  primaryColor,
  defaultTaskType,
  hideTaskTypeSelector = false,
  entityType,
  entityId,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState('')
  const [unifiedTaskType, setUnifiedTaskType] = useState<UnifiedTaskType | ''>(defaultTaskType || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState(userId || '')

  const { createTask, isPending } = useCreateTask()
  const { createFromTemplate, isPending: isCreatingFromTemplate } = useCreateTaskFromTemplate()

  // Fetch users for assignment dropdown
  const { data: users = [], isLoading: loadingUsers } = useUsers()

  // Filter users by department (Phase 2)
  // Check both departments[] array AND legacy department field
  const filteredUsers = useMemo(() => {
    const allUsers = users as UserWithDepartments[]

    return allUsers.filter(user => {
      // Check new departments array first
      if (user.departments && Array.isArray(user.departments)) {
        if (user.departments.includes(departmentId)) {
          return true
        }
      }
      // Fall back to legacy department field
      if (user.department === departmentId) {
        return true
      }
      return false
    })
  }, [users, departmentId])

  // Fetch templates filtered by unified task type
  const { data: templates = [] } = useTaskTemplates({
    task_type: unifiedTaskType || undefined,
    enabled: true,
  })

  const department = DEPARTMENTS[departmentId]
  const taskTypes = DEPARTMENT_TASK_TYPES[departmentId]

  // Reset unified task type when modal opens with a new default
  useEffect(() => {
    if (isOpen) {
      setUnifiedTaskType(defaultTaskType || '')
      // Also ensure assignedTo is updated if userId becomes available
      if (userId && !assignedTo) {
        setAssignedTo(userId)
      }
    }
  }, [isOpen, defaultTaskType, userId, assignedTo])

  // When a template is selected, populate the form
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setTitle(template.default_title)
        setDescription(template.default_description || '')
        setPriority(template.default_priority)

        // Calculate due date based on template settings
        // Note: Event-based due dates (use_event_date) will be calculated by the API
        // when the task is created, since this modal doesn't have access to event dates
        if (!template.use_event_date && template.default_due_in_days) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + template.default_due_in_days)
          setDueDate(dueDate.toISOString().split('T')[0])
        } else if (template.use_event_date) {
          // Clear due date - let API calculate from event date
          setDueDate('')
        }
      }
    }
  }, [selectedTemplateId, templates])

  // Reset template selection when task type changes
  useEffect(() => {
    setSelectedTemplateId('')
  }, [unifiedTaskType])

  const isSubmitting = isPending || isCreatingFromTemplate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    try {
      // If using a template, create from template
      if (selectedTemplateId) {
        await createFromTemplate({
          templateId: selectedTemplateId,
          entityType: entityType || null,
          entityId: entityId || null,
          assignedTo: assignedTo || null,
          title: title.trim(),
          priority,
          dueDate: dueDate || null,
        })
      } else {
        // Create task directly
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          department: departmentId,
          taskType: unifiedTaskType || taskType || undefined,
          priority,
          dueDate: dueDate || undefined,
          assignedTo: assignedTo || undefined,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          status: 'pending',
        })
      }

      // Reset form
      setTitle('')
      setDescription('')
      setTaskType('')
      setUnifiedTaskType(defaultTaskType || '')
      setSelectedTemplateId('')
      setPriority('medium')
      setDueDate('')
      setAssignedTo(userId || '')

      onClose()
    } catch (error) {
      log.error({ error }, 'Failed to create task')
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form on close
      setTitle('')
      setDescription('')
      setTaskType('')
      setUnifiedTaskType(defaultTaskType || '')
      setSelectedTemplateId('')
      setPriority('medium')
      setDueDate('')
      setAssignedTo(userId || '')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Add ${department.name} Task`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Unified Task Type - Category selector */}
        {!hideTaskTypeSelector && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Category
            </label>
            <select
              value={unifiedTaskType}
              onChange={(e) => setUnifiedTaskType(e.target.value as UnifiedTaskType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              disabled={isSubmitting}
            >
              <option value="">Select category...</option>
              {UNIFIED_TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {UNIFIED_TASK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Categorize this task (e.g., Design, Operations, Sales)
            </p>
          </div>
        )}

        {/* Template Selection - shown when templates are available */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="h-4 w-4 inline mr-1" />
              Use Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              disabled={isSubmitting}
            >
              <option value="">Start from scratch...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Templates pre-fill task details based on common workflows
            </p>
          </div>
        )}

        {/* Task Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Department-Specific Task Type (legacy - kept for backwards compatibility) */}
        {taskTypes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Type (Optional)
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              disabled={isSubmitting}
            >
              <option value="">Select task type...</option>
              {taskTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional details..."
            rows={3}
            className="w-full"
            disabled={isSubmitting}
          />
        </div>

        {/* Priority and Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              disabled={isSubmitting}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Assigned To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign To
          </label>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                disabled={isSubmitting}
              >
                <option value="">Unassigned</option>
                {filteredUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-600 mt-1 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                Showing {department.name} team ({filteredUsers.length})
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
