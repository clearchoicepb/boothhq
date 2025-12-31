'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Users } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import type { EventDate } from '@/types/events'
import type { UnifiedTaskType } from '@/types/tasks'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

// Display labels for unified task types
const UNIFIED_TASK_TYPE_LABELS: Record<UnifiedTaskType, string> = {
  general: 'General',
  design: 'Design',
  operations: 'Operations',
  sales: 'Sales',
  admin: 'Admin',
  accounting: 'Accounting',
  customer_success: 'Customer Success',
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
  'accounting',
  'customer_success',
  'project',
  'misc',
]

// Task types that map directly to departments
const TASK_TYPE_TO_DEPARTMENT: Partial<Record<UnifiedTaskType, string>> = {
  design: 'design',
  operations: 'operations',
  sales: 'sales',
  admin: 'admin',
  accounting: 'accounting',
  customer_success: 'customer_success',
}

// Department display names
const DEPARTMENT_LABELS: Record<string, string> = {
  design: 'Design',
  operations: 'Operations',
  sales: 'Sales',
  admin: 'Admin',
  accounting: 'Accounting',
  customer_success: 'Customer Success',
}

// User type for filtering
interface UserWithDepartments {
  id: string
  first_name: string
  last_name: string
  email: string
  departments?: string[] | null
  department?: string | null // Legacy field
}

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  entityType?: string
  entityId?: string
  projectId?: string   // Direct FK for project tasks (use instead of entityType/entityId for projects)
  eventDates?: EventDate[]
  accountId?: string | null
  contactId?: string | null
  onSuccess?: () => void
  /** Default unified task type - when set, pre-selects this type */
  defaultTaskType?: UnifiedTaskType
}

export function CreateTaskModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  projectId,
  eventDates,
  accountId,
  contactId,
  onSuccess,
  defaultTaskType
}: CreateTaskModalProps) {
  const { data: users = [], isLoading: loadingUsers } = useUsers()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [taskType, setTaskType] = useState<UnifiedTaskType | ''>(defaultTaskType || '')
  const [department, setDepartment] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    eventDateId: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  })

  // Auto-set department when task type changes (Phase 1)
  useEffect(() => {
    if (taskType && TASK_TYPE_TO_DEPARTMENT[taskType]) {
      setDepartment(TASK_TYPE_TO_DEPARTMENT[taskType] as string)
    } else {
      setDepartment(null)
    }
    // Clear assignee if they're not in the new department
    setFormData(prev => ({ ...prev, assignedTo: '' }))
  }, [taskType])

  // Filter users by department (Phase 2)
  // Check both departments[] array AND legacy department field
  const filteredUsers = useMemo(() => {
    const allUsers = users as UserWithDepartments[]

    if (!department) {
      // No department filter - show all users
      return allUsers
    }

    return allUsers.filter(user => {
      // Check new departments array first
      if (user.departments && Array.isArray(user.departments)) {
        if (user.departments.includes(department)) {
          return true
        }
      }
      // Fall back to legacy department field
      if (user.department === department) {
        return true
      }
      return false
    })
  }, [users, department])

  // Fetch templates filtered by department (derived from task type)
  // Templates are categorized by department, not task_type, so we filter by department
  const { data: templates = [] } = useTaskTemplates({
    department: department || undefined,
    enabled: true,
  })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        eventDateId: '',
        priority: 'medium',
        status: 'pending',
        dueDate: '',
      })
      setTaskType(defaultTaskType || '')
      // Department will be auto-set by the taskType effect
      setDepartment(defaultTaskType ? (TASK_TYPE_TO_DEPARTMENT[defaultTaskType] || null) : null)
      setSelectedTemplateId('')
      setError('')
      setErrors({})
    }
  }, [isOpen, defaultTaskType])

  // When a template is selected, populate the form
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: template.default_title,
          description: template.default_description || '',
          priority: template.default_priority,
        }))

        // Calculate due date based on template settings
        let calculatedDueDate: string | null = null

        // Check if template uses event-based due date calculation
        if (template.use_event_date && eventDates && eventDates.length > 0) {
          // Sort event dates
          const sortedDates = [...eventDates].sort((a, b) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          )

          // Pre-event: days before FIRST event date
          if (template.days_before_event !== null && template.days_before_event !== undefined) {
            const firstEventDate = new Date(sortedDates[0].event_date)
            firstEventDate.setDate(firstEventDate.getDate() - template.days_before_event)
            calculatedDueDate = firstEventDate.toISOString().split('T')[0]
            log.debug({
              eventDate: sortedDates[0].event_date,
              daysBefore: template.days_before_event,
              calculatedDueDate
            }, 'Calculated due date from event date (pre-event)')
          }
          // Post-event: days after LAST event date
          else if (template.days_after_event !== null && template.days_after_event !== undefined) {
            const lastEventDate = new Date(sortedDates[sortedDates.length - 1].event_date)
            lastEventDate.setDate(lastEventDate.getDate() + template.days_after_event)
            calculatedDueDate = lastEventDate.toISOString().split('T')[0]
            log.debug({
              eventDate: sortedDates[sortedDates.length - 1].event_date,
              daysAfter: template.days_after_event,
              calculatedDueDate
            }, 'Calculated due date from event date (post-event)')
          }
        }
        // Fallback to days-from-creation
        if (!calculatedDueDate && template.default_due_in_days) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + template.default_due_in_days)
          calculatedDueDate = dueDate.toISOString().split('T')[0]
        }

        if (calculatedDueDate) {
          setFormData(prev => ({
            ...prev,
            dueDate: calculatedDueDate
          }))
        }
      }
    }
  }, [selectedTemplateId, templates, eventDates])

  // Reset template selection when task type changes
  useEffect(() => {
    setSelectedTemplateId('')
  }, [taskType])

  // Clear field error when user types
  const handleTitleChange = (value: string) => {
    setFormData(prev => ({ ...prev, title: value }))
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      // Get task_timing from selected template (if any)
      const selectedTemplate = selectedTemplateId
        ? templates.find(t => t.id === selectedTemplateId)
        : null

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          assignedTo: formData.assignedTo || null,
          eventDateId: formData.eventDateId || null,
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate || null,
          entityType,
          entityId,
          projectId, // Direct FK for project tasks
          taskType: taskType || null, // Unified task type
          department: department, // Auto-set from task type (Phase 1)
          taskTemplateId: selectedTemplateId || null,
          taskTiming: selectedTemplate?.task_timing || null, // Inherit from template
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create task')
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      log.error({ err }, 'Error creating task')
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Task Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Category
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as UnifiedTaskType | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

        {/* Template Selection - shown when templates are available */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Use Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Follow up with client"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Add task details..."
          />
        </div>

        {entityType === 'event' && eventDates && eventDates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date (Optional)
            </label>
            <select
              value={formData.eventDateId}
              onChange={(e) => setFormData({ ...formData, eventDateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Overall Event (not specific to a date)</option>
              {eventDates.map((eventDate) => (
                <option key={eventDate.id} value={eventDate.id}>
                  {new Date(eventDate.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Unassigned</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
                {department && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    Showing {DEPARTMENT_LABELS[department] || department} team ({filteredUsers.length})
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !formData.title.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
