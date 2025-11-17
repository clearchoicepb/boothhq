'use client'

/**
 * Action Card Component
 *
 * Individual action configuration card
 * Allows selecting task template and assigned user
 */

import { useState, useEffect } from 'react'
import { Trash2, ClipboardCheck, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkflowBuilderAction } from '@/types/workflows'

interface TaskTemplate {
  id: string
  name: string
  default_title: string
  department: string
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
        // Ensure templates is an array
        setTaskTemplates(Array.isArray(templates) ? templates : [])
      }

      // Fetch users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        // Ensure usersData is an array
        setUsers(Array.isArray(usersData) ? usersData : [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setTaskTemplates([]) // Reset to empty arrays on error
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = taskTemplates.find(t => t.id === action.taskTemplateId)
  const selectedUser = users.find(u => u.id === action.assignedToUserId)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Create Task</h4>
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

          {/* Preview */}
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
        </div>
      )}
    </div>
  )
}

