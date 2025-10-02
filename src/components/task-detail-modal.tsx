'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, User, Calendar, Loader2 } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  created_by: string
  entity_type: string | null
  entity_id: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  assigned_to_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  created_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

export function TaskDetailModal({ task, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    assignedTo: task.assigned_to || '',
    priority: task.priority,
    status: task.status,
    dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('Task title is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          assignedTo: formData.assignedTo || null,
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate || null,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update task')
      }

      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error updating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDelete()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task')
    }
  }

  const handleStatusToggle = () => {
    const newStatus = formData.status === 'completed' ? 'pending' : 'completed'
    setFormData({ ...formData, status: newStatus })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-600" />
      case 'cancelled':
        return <AlertCircle className="h-6 w-6 text-gray-400" />
      default:
        return <Circle className="h-6 w-6 text-gray-400" />
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Task Details"
      className="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Status Toggle */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <button
            type="button"
            onClick={handleStatusToggle}
            className="flex-shrink-0"
          >
            {getStatusIcon(formData.status)}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              {formData.status === 'completed' ? 'Completed' : 'Mark as Complete'}
            </p>
            <p className="text-xs text-gray-500">
              Click the icon to toggle completion status
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g., Follow up with client"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Add task details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
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

        {/* Metadata */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center text-xs text-gray-500">
            <User className="h-3 w-3 mr-2" />
            Created by: {task.created_by_user ? `${task.created_by_user.first_name} ${task.created_by_user.last_name}` : 'Unknown'}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-2" />
            Created: {new Date(task.created_at).toLocaleDateString()} at {new Date(task.created_at).toLocaleTimeString()}
          </div>
          {task.completed_at && (
            <div className="flex items-center text-xs text-gray-500">
              <CheckCircle2 className="h-3 w-3 mr-2" />
              Completed: {new Date(task.completed_at).toLocaleDateString()} at {new Date(task.completed_at).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <div className="flex space-x-3">
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
