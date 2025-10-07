'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

interface CoreTaskCompletion {
  id: string
  core_task_template_id: string
  is_completed: boolean
  completed_at: string | null
  core_task_template: {
    id: string
    task_name: string
    display_order: number
  }
}

interface EventCoreTasksChecklistProps {
  eventId: string
  onCompletionChange?: (allCompleted: boolean) => void
}

export function EventCoreTasksChecklist({ eventId, onCompletionChange }: EventCoreTasksChecklistProps) {
  const [coreTasks, setCoreTasks] = useState<CoreTaskCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [previousCompletionStatus, setPreviousCompletionStatus] = useState<boolean | null>(null)

  useEffect(() => {
    fetchCoreTasks()
  }, [eventId])

  const fetchCoreTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/core-tasks`)
      if (response.ok) {
        const data = await response.json()

        // If no tasks exist, try to initialize them
        if (data.length === 0) {
          await initializeCoreTasks()
          // Retry fetching after initialization
          const retryResponse = await fetch(`/api/events/${eventId}/core-tasks`)
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            setCoreTasks(retryData)

            const allCompleted = retryData.length > 0 && retryData.every((task: CoreTaskCompletion) => task.is_completed)
            // Only notify if completion status changed
            if (onCompletionChange && previousCompletionStatus !== allCompleted) {
              setPreviousCompletionStatus(allCompleted)
              onCompletionChange(allCompleted)
            }
          }
        } else {
          setCoreTasks(data)

          // Check if all tasks are completed
          const allCompleted = data.length > 0 && data.every((task: CoreTaskCompletion) => task.is_completed)
          // Only notify if completion status changed
          if (onCompletionChange && previousCompletionStatus !== allCompleted) {
            setPreviousCompletionStatus(allCompleted)
            onCompletionChange(allCompleted)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching core tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializeCoreTasks = async () => {
    try {
      await fetch(`/api/events/${eventId}/core-tasks/initialize`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error initializing core tasks:', error)
    }
  }

  const handleToggleCompletion = async (completionId: string, currentStatus: boolean) => {
    setUpdating(prev => new Set(prev).add(completionId))

    try {
      const response = await fetch(`/api/events/${eventId}/core-tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_id: completionId,
          is_completed: !currentStatus
        })
      })

      if (response.ok) {
        await fetchCoreTasks()
      }
    } catch (error) {
      console.error('Error updating core task:', error)
    } finally {
      setUpdating(prev => {
        const next = new Set(prev)
        next.delete(completionId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6 min-h-[120px]">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-500">Loading checklist...</span>
        </div>
      </div>
    )
  }

  if (coreTasks.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6 min-h-[120px] opacity-0 pointer-events-none" aria-hidden="true">
        {/* Invisible placeholder to prevent layout shift */}
      </div>
    )
  }

  const allCompleted = coreTasks.every(task => task.is_completed)
  const completedCount = coreTasks.filter(task => task.is_completed).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6">
      {/* Banner when all complete */}
      {allCompleted && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-semibold text-green-800">✓ Ready for Event</span>
            <span className="ml-auto text-xs text-green-600">All tasks completed</span>
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {coreTasks.map((task) => (
          <button
            key={task.id}
            onClick={() => handleToggleCompletion(task.id, task.is_completed)}
            disabled={updating.has(task.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
              task.is_completed
                ? 'bg-green-50 border-green-300 hover:bg-green-100'
                : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
            } ${updating.has(task.id) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            <div className="flex-shrink-0">
              {task.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className={`text-xs sm:text-sm font-medium leading-tight ${
                task.is_completed ? 'text-green-900 line-through' : 'text-gray-900'
              }`}>
                {task.core_task_template.task_name}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Progress indicator */}
      {!allCompleted && (
        <div className="mt-4 flex items-center justify-center">
          <div className="text-xs text-gray-500">
            {completedCount} of {coreTasks.length} tasks completed
          </div>
        </div>
      )}
    </div>
  )
}
