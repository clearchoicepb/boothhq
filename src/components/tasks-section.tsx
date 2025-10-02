'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, User } from 'lucide-react'
import { TaskDetailModal } from './task-detail-modal'

// Simple time ago function
function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'

  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'

  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'

  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'

  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'

  return 'just now'
}

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

interface TasksSectionProps {
  entityType: string
  entityId: string
  onRefresh?: () => void
}

export function TasksSection({ entityType, entityId, onRefresh }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [entityType, entityId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tasks?entityType=${entityType}&entityId=${entityId}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTasks(prev => new Set(prev).add(taskId))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchTasks()
        if (onRefresh) {
          onRefresh()
        }
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setUpdatingTasks(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-gray-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading tasks...</p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <CheckCircle2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">No tasks yet.</p>
        <p className="text-xs text-gray-500 mt-1">Create a task to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => setSelectedTask(task)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${
              task.status === 'completed' ? 'opacity-60' : ''
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
                handleStatusChange(task.id, nextStatus)
              }}
              disabled={updatingTasks.has(task.id)}
              className="flex-shrink-0"
            >
              {getStatusIcon(task.status)}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium text-gray-900 truncate ${task.status === 'completed' ? 'line-through' : ''}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                {task.assigned_to_user && (
                  <span className="text-xs text-gray-500 truncate">
                    {task.assigned_to_user.first_name} {task.assigned_to_user.last_name}
                  </span>
                )}
                {task.due_date && (
                  <span className="text-xs text-gray-500">
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            fetchTasks()
            if (onRefresh) onRefresh()
          }}
          onDelete={() => {
            setSelectedTask(null)
            fetchTasks()
            if (onRefresh) onRefresh()
          }}
        />
      )}
    </>
  )
}
