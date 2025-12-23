'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, User } from 'lucide-react'
import { TaskDetailModal } from './task-detail-modal'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

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
  event_date_id: string | null
  project_id: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  parent_task_id?: string | null // Subtask hierarchy
  subtask_progress?: { total: number; completed: number } // For badge display
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
  event_date?: {
    id: string
    event_date: string
  }
  project?: {
    id: string
    name: string
    target_date: string | null
  }
}

interface TasksSectionProps {
  entityType?: string  // For events, opportunities, etc.
  entityId?: string
  projectId?: string   // Direct FK for project tasks
  onRefresh?: () => void
}

export function TasksSection({ entityType, entityId, projectId, onRefresh }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('all') // 'all', 'overall', or event_date_id

  useEffect(() => {
    fetchTasks()
  }, [entityType, entityId, projectId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      // Use projectId for project tasks, entityType/entityId for others
      let url = '/api/tasks?excludeSubtasks=true&includeSubtaskProgress=true'
      if (projectId) {
        url += `&projectId=${projectId}`
      } else if (entityType && entityId) {
        url += `&entityType=${entityType}&entityId=${entityId}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching tasks')
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
      log.error({ error }, 'Error updating task')
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

  // Group tasks for events with multiple dates
  const groupTasksByDate = () => {
    const overallTasks = tasks.filter(t => !t.event_date_id)
    const dateTasks = tasks.filter(t => t.event_date_id)

    // Group by event date
    const grouped: Record<string, Task[]> = {}
    dateTasks.forEach(task => {
      if (task.event_date) {
        const dateKey = task.event_date.event_date
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(task)
      }
    })

    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    )

    return { overallTasks, grouped, sortedDates }
  }

  // Filter tasks based on selected filter
  const getFilteredTasks = () => {
    if (dateFilter === 'all') {
      return tasks
    } else if (dateFilter === 'overall') {
      return tasks.filter(t => !t.event_date_id)
    } else {
      return tasks.filter(t => t.event_date_id === dateFilter)
    }
  }

  // Check if this is an event with multiple event dates
  const isEventWithDates = entityType === 'event' && tasks.some(t => t.event_date_id)

  // Get unique event dates for filter dropdown
  const eventDatesMap = new Map<string, { id: string; date: string }>()
  tasks.filter(t => t.event_date).forEach(t => {
    if (t.event_date && !eventDatesMap.has(t.event_date.id)) {
      eventDatesMap.set(t.event_date.id, {
        id: t.event_date.id,
        date: t.event_date.event_date
      })
    }
  })
  const eventDates = Array.from(eventDatesMap.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading tasks...</p>
      </div>
    )
  }

  // Helper to render a single task
  const renderTask = (task: Task) => (
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
          {task.subtask_progress && task.subtask_progress.total > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              {task.subtask_progress.completed}/{task.subtask_progress.total}
            </span>
          )}
          {task.event_date && !isEventWithDates && (
            <span className="text-xs text-blue-600 font-medium">
              📅 {new Date(task.event_date.event_date).toLocaleDateString()}
            </span>
          )}
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
  )

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <CheckCircle2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">No tasks yet.</p>
        <p className="text-xs text-gray-500 mt-1">Create a task to get started</p>
      </div>
    )
  }

  // Render grouped view for events with dates, otherwise flat list
  const { overallTasks, grouped, sortedDates } = groupTasksByDate()
  const filteredTasks = getFilteredTasks()

  return (
    <>
      {/* Filter dropdown for events with dates */}
      {isEventWithDates && (
        <div className="mb-4">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
          >
            <option value="all">All Tasks</option>
            <option value="overall">Overall Event Tasks</option>
            {eventDates.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {new Date(ed.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Show grouped view if event with dates and viewing all */}
      {isEventWithDates && dateFilter === 'all' ? (
        <div className="space-y-6">
          {/* Overall Event Tasks */}
          {overallTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 px-2">
                Overall Event Tasks
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({overallTasks.length})
                </span>
              </h3>
              <div className="space-y-1">
                {overallTasks.map(renderTask)}
              </div>
            </div>
          )}

          {/* Date-Specific Tasks */}
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 px-2">
                📅 {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({grouped[date].length})
                </span>
              </h3>
              <div className="space-y-1">
                {grouped[date].map(renderTask)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat list view */
        <div className="space-y-1">
          {filteredTasks.map(renderTask)}
        </div>
      )}

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
