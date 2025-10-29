'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Loader2, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Task {
  id: string // This is the completion_id
  core_task_template_id: string
  task_name: string
  task_description: string | null
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  core_task_template?: {
    id: string
    task_name: string
    task_description?: string | null
  }
}

interface EventInlineTasksProps {
  eventId: string
  tasks: Task[]
  onTaskUpdate: () => void
  onAllTasksComplete?: () => void
}

export function EventInlineTasks({
  eventId,
  tasks,
  onTaskUpdate,
  onAllTasksComplete
}: EventInlineTasksProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [markingReady, setMarkingReady] = useState(false)
  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)

  // Sync local state with prop changes (after server updates)
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const completedCount = localTasks.filter(t => t.is_completed).length
  const allTasksComplete = completedCount === localTasks.length && localTasks.length > 0

  const handleTaskToggle = async (completionId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus

    // INSTANT OPTIMISTIC UPDATE - Update UI immediately
    setLocalTasks(prev =>
      prev.map(t =>
        t.id === completionId
          ? { ...t, is_completed: newStatus, completed_at: newStatus ? new Date().toISOString() : null }
          : t
      )
    )

    // Show immediate visual feedback with toast
    toast.success(
      newStatus ? '✓ Task completed!' : '○ Task marked incomplete',
      { duration: 2000, icon: newStatus ? '✅' : '⭕' }
    )

    // Mark as updating for spinner (optional, can be removed for cleaner UX)
    setUpdatingTasks(prev => new Set(prev).add(completionId))

    try {
      const response = await fetch(`/api/events/${eventId}/core-tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_id: completionId,
          is_completed: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      // Trigger cache reload to sync with server
      onTaskUpdate()

      // Check if all tasks are now complete
      const updatedTasks = localTasks.map(t =>
        t.id === completionId ? { ...t, is_completed: newStatus } : t
      )
      const allComplete = updatedTasks.every(t => t.is_completed)
      if (allComplete && onAllTasksComplete) {
        onAllTasksComplete()
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('❌ Failed to update task - please try again')

      // ROLLBACK optimistic update on error
      setLocalTasks(prev =>
        prev.map(t =>
          t.id === completionId
            ? { ...t, is_completed: currentStatus, completed_at: t.completed_at }
            : t
        )
      )
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(completionId)
        return newSet
      })
    }
  }

  const handleMarkAllComplete = async () => {
    setMarkingReady(true)

    const incompleteTasks = localTasks.filter(t => !t.is_completed)
    const now = new Date().toISOString()

    // INSTANT OPTIMISTIC UPDATE - Mark all as complete immediately
    setLocalTasks(prev =>
      prev.map(t => ({
        ...t,
        is_completed: true,
        completed_at: t.is_completed ? t.completed_at : now
      }))
    )

    // Show immediate success message
    toast.success('🎉 All tasks completed! Event is ready!', { duration: 3000 })

    try {
      const promises = incompleteTasks.map(task =>
        fetch(`/api/events/${eventId}/core-tasks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completion_id: task.id,
            is_completed: true
          })
        })
      )

      await Promise.all(promises)

      // Trigger cache reload to sync with server
      onTaskUpdate()
      if (onAllTasksComplete) {
        onAllTasksComplete()
      }
    } catch (error) {
      console.error('Error marking all tasks complete:', error)
      toast.error('❌ Failed to complete all tasks - please try again')

      // ROLLBACK optimistic update on error
      setLocalTasks(prev =>
        prev.map(t => {
          const original = tasks.find(orig => orig.id === t.id)
          return original ? { ...original } : t
        })
      )
    } finally {
      setMarkingReady(false)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="py-4 px-6 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">No tasks configured for this event</p>
      </div>
    )
  }

  return (
    <div className="py-4 px-6 bg-gray-50 border-t border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Event Tasks</h4>
          <p className="text-xs text-gray-600 mt-0.5">
            {completedCount} of {tasks.length} tasks complete
          </p>
        </div>

        {!allTasksComplete && (
          <button
            onClick={handleMarkAllComplete}
            disabled={markingReady}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {markingReady ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                Mark All Complete
              </>
            )}
          </button>
        )}

        {allTasksComplete && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-md text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Event Ready
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              allTasksComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {localTasks.map(task => {
          const isUpdating = updatingTasks.has(task.id)

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 bg-white rounded-lg border transition-all duration-300 ${
                task.is_completed
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleTaskToggle(task.id, task.is_completed)}
                disabled={isUpdating}
                className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:ring-offset-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUpdating ? (
                  <Loader2 className="h-5 w-5 text-[#347dc4] animate-spin" />
                ) : task.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in duration-200" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium transition-all duration-300 ${
                  task.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}>
                  {task.core_task_template?.task_name || task.task_name || 'Unnamed Task'}
                </p>
                {(task.core_task_template?.task_description || task.task_description) && (
                  <p className={`text-xs mt-1 transition-all duration-300 ${
                    task.is_completed ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {task.core_task_template?.task_description || task.task_description}
                  </p>
                )}
                {task.is_completed && task.completed_at && (
                  <p className="text-xs text-gray-400 mt-1 animate-in fade-in duration-300">
                    Completed {new Date(task.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
