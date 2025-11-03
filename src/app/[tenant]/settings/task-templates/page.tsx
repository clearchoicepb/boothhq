'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTaskTemplates, useTaskTemplateMutations } from '@/hooks/useTaskTemplates'
import { DEPARTMENTS, getDepartmentById, type DepartmentId } from '@/lib/departments'
import type { TaskTemplate } from '@/lib/api/services/taskTemplateService'
import { TaskTemplateForm } from '@/components/task-templates/task-template-form'

/**
 * Task Templates Settings Page
 *
 * Admin page for managing task templates.
 * Allows admins to create, edit, enable/disable, and delete task templates.
 */
export default function TaskTemplatesSettingsPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId>('sales')
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: templates, isLoading } = useTaskTemplates({ department: selectedDepartment })
  const { deleteTemplate, toggleEnabled } = useTaskTemplateMutations()

  const handleDelete = async (template: TaskTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return
    }

    try {
      await deleteTemplate.mutateAsync(template.id)
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleToggle = async (template: TaskTemplate) => {
    try {
      await toggleEnabled.mutateAsync({
        id: template.id,
        enabled: !template.enabled,
      })
    } catch (error) {
      console.error('Failed to toggle template:', error)
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Task Templates</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create and manage task templates for quick task creation across your team.
        </p>
      </div>

      {/* Department Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {Object.values(DEPARTMENTS)
            .filter((dept) => dept.id !== 'event_staff')
            .map((dept) => {
              const isActive = selectedDepartment === dept.id
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(dept.id as DepartmentId)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  style={
                    isActive
                      ? {
                          borderBottomColor: dept.color,
                          color: dept.color,
                        }
                      : {}
                  }
                >
                  {dept.name}
                </button>
              )
            })}
        </nav>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {getDepartmentById(selectedDepartment).name} Templates
          </h2>
          <p className="text-sm text-gray-600">
            {templates?.length || 0} template{templates?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className={template.enabled ? '' : 'opacity-50 bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="text-xs text-gray-500">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {template.default_title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getPriorityBadgeClass(
                        template.default_priority
                      )}`}
                    >
                      {template.default_priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.default_due_in_days !== null
                      ? `${template.default_due_in_days} day${
                          template.default_due_in_days !== 1 ? 's' : ''
                        }`
                      : 'No default'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        template.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {template.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleToggle(template)}
                        className="text-gray-400 hover:text-gray-600"
                        title={template.enabled ? 'Disable' : 'Enable'}
                      >
                        {template.enabled ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Plus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first task template for{' '}
            {getDepartmentById(selectedDepartment).name}.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingTemplate) && (
        <TaskTemplateForm
          template={editingTemplate}
          defaultDepartment={selectedDepartment}
          onClose={() => {
            setIsCreating(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
