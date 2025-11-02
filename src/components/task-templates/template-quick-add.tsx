'use client'

import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { useTaskTemplatesByDepartment } from '@/hooks/useTaskTemplates'
import { useCreateTaskFromTemplate } from '@/hooks/useTaskActions'
import { inferDepartmentFromEntity, type DepartmentId } from '@/lib/departments'

interface TemplateQuickAddProps {
  entityType?: string
  entityId?: string
  eventDateId?: string
  assignedTo?: string
  department?: DepartmentId
  onTaskCreated?: () => void
  className?: string
}

/**
 * Template Quick-Add Component
 *
 * Dropdown button that shows available task templates for quick task creation.
 * Can infer department from entity type or use explicit department prop.
 *
 * Usage in Opportunities:
 * <TemplateQuickAdd entityType="opportunity" entityId={oppId} />
 *
 * Usage in Events:
 * <TemplateQuickAdd entityType="event" entityId={eventId} />
 */
export function TemplateQuickAdd({
  entityType,
  entityId,
  eventDateId,
  assignedTo,
  department,
  onTaskCreated,
  className = '',
}: TemplateQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)

  // Infer department from entity type if not explicitly provided
  const inferredDepartment = department || (entityType ? inferDepartmentFromEntity(entityType) : null)

  const { data: templates, isLoading } = useTaskTemplatesByDepartment(
    inferredDepartment || 'sales'
  )
  const { createFromTemplate } = useCreateTaskFromTemplate()

  const handleCreateFromTemplate = async (templateId: string) => {
    setCreating(templateId)

    try {
      await createFromTemplate({
        templateId,
        entityType: entityType || null,
        entityId: entityId || null,
        eventDateId: eventDateId || null,
        assignedTo: assignedTo || null,
      })

      setIsOpen(false)
      onTaskCreated?.()
    } catch (error) {
      console.error('Failed to create task from template:', error)
    } finally {
      setCreating(null)
    }
  }

  // Don't render if no templates available
  if (!isLoading && (!templates || templates.length === 0)) {
    return null
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <Zap className="h-4 w-4 mr-2 text-yellow-500" />
        {isLoading ? 'Loading...' : 'Quick Add'}
        <ChevronDown className="h-4 w-4 ml-2" />
      </button>

      {isOpen && templates && templates.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <div className="px-3 py-2 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">
                  Task Templates
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create tasks quickly from templates
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleCreateFromTemplate(template.id)}
                    disabled={creating !== null}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {template.default_title}
                        </div>
                        {template.description && (
                          <div className="text-xs text-gray-400 mt-1">
                            {template.description}
                          </div>
                        )}
                      </div>

                      <div className="ml-2 flex-shrink-0">
                        {creating === template.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                        ) : (
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                              template.default_priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : template.default_priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : template.default_priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {template.default_priority}
                          </span>
                        )}
                      </div>
                    </div>

                    {template.default_due_in_days !== null && (
                      <div className="text-xs text-gray-400 mt-1">
                        Due in {template.default_due_in_days} day
                        {template.default_due_in_days !== 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-gray-500">
                    No templates available for this department
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
