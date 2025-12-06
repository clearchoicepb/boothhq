'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useTaskTemplateMutations } from '@/hooks/useTaskTemplates'
import {
  DEPARTMENTS,
  DEPARTMENT_TASK_TYPES,
  getDepartmentById,
  type DepartmentId,
} from '@/lib/departments'
import type { TaskTemplate } from '@/lib/api/services/taskTemplateService'
import { createLogger } from '@/lib/logger'

const log = createLogger('task-templates')

interface TaskTemplateFormProps {
  template?: TaskTemplate | null
  defaultDepartment?: DepartmentId
  onClose: () => void
}

/**
 * Task Template Form Component
 *
 * Modal form for creating and editing task templates.
 * Supports both creation and editing modes.
 */
export function TaskTemplateForm({
  template,
  defaultDepartment = 'sales',
  onClose,
}: TaskTemplateFormProps) {
  const isEditing = !!template
  const { createTemplate, updateTemplate } = useTaskTemplateMutations()

  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    department: template?.department || defaultDepartment,
    task_type: template?.task_type || '',
    default_title: template?.default_title || '',
    default_description: template?.default_description || '',
    default_priority: template?.default_priority || 'medium',
    default_due_in_days: template?.default_due_in_days?.toString() || '',
    requires_assignment: template?.requires_assignment || false,
    enabled: template?.enabled ?? true,
    display_order: template?.display_order?.toString() || '0',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Get task types for selected department
  const taskTypes = DEPARTMENT_TASK_TYPES[formData.department as DepartmentId] || []

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required'
    }

    if (!formData.default_title.trim()) {
      newErrors.default_title = 'Default title is required'
    }

    if (!formData.department) {
      newErrors.department = 'Department is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSaving(true)

    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        department: formData.department,
        task_type: formData.task_type || null,
        default_title: formData.default_title.trim(),
        default_description: formData.default_description.trim() || null,
        default_priority: formData.default_priority as 'low' | 'medium' | 'high' | 'urgent',
        default_due_in_days: formData.default_due_in_days
          ? parseInt(formData.default_due_in_days)
          : null,
        requires_assignment: formData.requires_assignment,
        enabled: formData.enabled,
        display_order: parseInt(formData.display_order) || 0,
      }

      if (isEditing) {
        await updateTemplate.mutateAsync({
          id: template.id,
          updates: data,
        })
      } else {
        await createTemplate.mutateAsync(data)
      }

      onClose()
    } catch (error) {
      log.error({ error }, 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Task Template' : 'Create Task Template'}
      className="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Follow Up Lead, Send Quote"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Brief description of when to use this template"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.department}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  department: e.target.value,
                  task_type: '', // Reset task type when department changes
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.department ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isEditing}
            >
              {Object.values(DEPARTMENTS)
                .filter((dept) => dept.id !== 'event_staff')
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
            {isEditing && (
              <p className="mt-1 text-xs text-gray-500">
                Department cannot be changed after creation
              </p>
            )}
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Type
            </label>
            <select
              value={formData.task_type}
              onChange={(e) =>
                setFormData({ ...formData, task_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">None (Custom)</option>
              {taskTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Optional: Link to predefined task type
            </p>
          </div>
        </div>

        {/* Default Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.default_title}
            onChange={(e) =>
              setFormData({ ...formData, default_title: e.target.value })
            }
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              errors.default_title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Follow up with lead"
          />
          {errors.default_title && (
            <p className="mt-1 text-sm text-red-600">{errors.default_title}</p>
          )}
        </div>

        {/* Default Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Task Description
          </label>
          <textarea
            value={formData.default_description}
            onChange={(e) =>
              setFormData({ ...formData, default_description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Default description for tasks created from this template"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Priority
            </label>
            <select
              value={formData.default_priority}
              onChange={(e) =>
                setFormData({ ...formData, default_priority: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Due In Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due In (Days)
            </label>
            <input
              type="number"
              min="0"
              value={formData.default_due_in_days}
              onChange={(e) =>
                setFormData({ ...formData, default_due_in_days: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Leave empty for no default"
            />
            <p className="mt-1 text-xs text-gray-500">
              Days from task creation
            </p>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.requires_assignment}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requires_assignment: e.target.checked,
                })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Requires assignment (task must be assigned to someone)
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Enabled (template is active and available)
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              'Update Template'
            ) : (
              'Create Template'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
