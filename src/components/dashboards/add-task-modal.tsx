'use client'

/**
 * Add Task Modal Component
 *
 * Quick task creation modal for department dashboards
 * Pre-populates department context and shows department-specific task types
 */

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTask } from '@/hooks/useTaskActions'
import { DEPARTMENTS, DEPARTMENT_TASK_TYPES, type DepartmentId } from '@/lib/departments'
import { Plus } from 'lucide-react'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  departmentId: DepartmentId
  userId?: string
  primaryColor: string
}

export function AddTaskModal({
  isOpen,
  onClose,
  departmentId,
  userId,
  primaryColor,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState(userId || '')

  const { createTask, isPending } = useCreateTask()

  const department = DEPARTMENTS[departmentId]
  const taskTypes = DEPARTMENT_TASK_TYPES[departmentId]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        department: departmentId,
        taskType: taskType || undefined,
        priority,
        dueDate: dueDate || undefined,
        assignedTo: assignedTo || undefined,
        status: 'pending',
      })

      // Reset form
      setTitle('')
      setDescription('')
      setTaskType('')
      setPriority('medium')
      setDueDate('')
      setAssignedTo(userId || '')

      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleClose = () => {
    if (!isPending) {
      // Reset form on close
      setTitle('')
      setDescription('')
      setTaskType('')
      setPriority('medium')
      setDueDate('')
      setAssignedTo(userId || '')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Add ${department.name} Task`}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={isPending}
          />
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Type (Optional)
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            disabled={isPending}
          >
            <option value="">Select task type...</option>
            {taskTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

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
            disabled={isPending}
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
              disabled={isPending}
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
              disabled={isPending}
            />
          </div>
        </div>

        {/* Assigned To (simple text for now - could be enhanced with user dropdown) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To (User ID)
          </label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Leave empty for unassigned"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            disabled={isPending}
          />
          <p className="text-xs text-gray-500 mt-1">
            Currently requires user ID. Leave empty to create unassigned task.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            {isPending ? (
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
