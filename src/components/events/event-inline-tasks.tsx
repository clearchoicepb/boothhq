'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Loader2, CheckCheck, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import { isTaskCompleted } from '@/lib/utils/event-readiness'
import type { EventTask } from '@/types/events'

const log = createLogger('events')

/**
 * Task interface for inline display
 * Compatible with the unified tasks table
 */
interface Task extends EventTask {
  title: string
  description?: string | null
  priority?: string
  due_date?: string | null
}

interface EventInlineTasksProps {
  eventId: string
  tasks: Task[]
  onTaskUpdate: () => void
  onAllTasksComplete?: () => void
}

/**
 * EventInlineTasks Component
 *
 * Displays tasks for an event in an expandable inline format.
 * Updated to work with the unified Tasks table instead of Core Tasks.
 *
 * A task is considered "completed" if status is 'completed' or 'approved'.
 */
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

  const completedCount = localTasks.filter(t => isTaskCompleted(t.status)).length
  const allTasksComplete = completedCount === localTasks.length && localTasks.length > 0

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const isCurrentlyCompleted = isTaskCompleted(currentStatus)
    const newStatus = isCurrentlyCompleted ? 'pending' : 'completed'

    // INSTANT OPTIMISTIC UPDATE - Update UI immediately
    setLocalTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            }
          : t
      )
    )

    // Show immediate visual feedback with toast
    toast.success(
      newStatus === 'completed' ? '✓ Task completed!' : '○ Task marked incomplete',
      { duration: 2000, icon: newStatus === 'completed' ? '✅' : '⭕' }
    )

    // Mark as updating for spinner
    setUpdatingTasks(prev => new Set(prev).add(taskId))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      // Trigger cache reload to sync with server
      onTaskUpdate()

      // Check if all tasks are now complete
      const updatedTasks = localTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
      const allComplete = updatedTasks.every(t => isTaskCompleted(t.status))
      if (allComplete && onAllTasksComplete) {
        onAllTasksComplete()
      }
    } catch (error) {
      log.error({ error }, 'Error updating task')
      toast.error('❌ Failed to update task - please try again')

      // ROLLBACK optimistic update on error
      setLocalTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: currentStatus, completed_at: tasks.find(orig => orig.id === taskId)?.completed_at }
            : t
        )
      )
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleMarkAllComplete = async () => {
    setMarkingReady(true)

    const incompleteTasks = localTasks.filter(t => !isTaskCompleted(t.status))
    const now = new Date().toISOString()

    // INSTANT OPTIMISTIC UPDATE - Mark all as complete immediately
    setLocalTasks(prev =>
      prev.map(t => ({
        ...t,
        status: 'completed',
        completed_at: isTaskCompleted(t.status) ? t.completed_at : now
      }))
    )

    // Show immediate success message
    toast.success('🎉 All tasks completed! Event is ready!', { duration: 3000 })

    try {
      const promises = incompleteTasks.map(task =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            completed_at: now
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
      log.error({ error }, 'Error marking all tasks complete')
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
        <p className="text-sm text-gray-500 text-center">No tasks assigned to this event</p>
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
          const isCompleted = isTaskCompleted(task.status)
          const isPriorityHigh = task.priority === 'high' || task.priority === 'urgent'

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 bg-white rounded-lg border transition-all duration-300 ${
                isCompleted
                  ? 'border-green-200 bg-green-50/50'
                  : isPriorityHigh
                  ? 'border-orange-200 bg-orange-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleTaskToggle(task.id, task.status)}
                disabled={isUpdating}
                className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:ring-offset-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUpdating ? (
                  <Loader2 className="h-5 w-5 text-[#347dc4] animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in duration-200" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium transition-all duration-300 ${
                    isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {task.title || 'Unnamed Task'}
                  </p>
                  {isPriorityHigh && !isCompleted && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700">
                      <AlertCircle className="h-3 w-3" />
                      {task.priority}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className={`text-xs mt-1 transition-all duration-300 ${
                    isCompleted ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {task.due_date && (
                    <p className={`text-xs ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                  {isCompleted && task.completed_at && (
                    <p className="text-xs text-gray-400 animate-in fade-in duration-300">
                      Completed {new Date(task.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
