/**
 * useEventReadiness Hook
 *
 * Provides event readiness data based on the Tasks table.
 * Can be used for both single events and lists.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  calculateEventReadiness,
  filterPreEventTasks,
  isTaskCompleted,
  isTaskExcluded,
  type EventReadiness,
  type TaskForReadiness
} from '@/lib/utils/event-readiness'
import type { Event, EventTask } from '@/types/events'

/**
 * Get the first (earliest) event date from an event
 * Used as the cutoff for pre-event task filtering
 */
function getFirstEventDate(event: Event): string | null {
  // Try to get from event_dates first
  if (event.event_dates && event.event_dates.length > 0) {
    const sortedDates = event.event_dates
      .map((d: any) => d.event_date)
      .filter(Boolean)
      .sort()
    if (sortedDates[0]) return sortedDates[0]
  }
  // Fall back to start_date
  return event.start_date || null
}

/**
 * Get event readiness from an Event object
 * Uses pre-calculated task_readiness if available, otherwise calculates from event_tasks
 * Only counts pre-event tasks (tasks with due_date on or before the event date)
 */
export function getEventReadiness(event: Event): EventReadiness {
  // If we have pre-calculated readiness from the API, use it
  // The API now calculates this with pre-event task filtering
  if (event.task_readiness) {
    return event.task_readiness
  }

  // Otherwise calculate from event_tasks (with pre-event filtering)
  if (event.event_tasks && event.event_tasks.length > 0) {
    const eventDate = getFirstEventDate(event)
    return calculateEventReadiness(event.event_tasks as TaskForReadiness[], eventDate)
  }

  // No task data available
  return {
    total: 0,
    completed: 0,
    percentage: 0,
    isReady: false,
    hasTasks: false
  }
}

/**
 * Get incomplete pre-event tasks for an event
 * Only returns tasks with due_date on or before the event date
 * Tasks with no due_date are included (assumed to be pre-event)
 * Excludes cancelled tasks
 */
export function getIncompleteEventTasks(event: Event): EventTask[] {
  if (!event.event_tasks) {
    return []
  }

  const eventDate = getFirstEventDate(event)

  // Filter to pre-event tasks first (excluding cancelled), then filter to incomplete
  const preEventTasks = filterPreEventTasks(
    event.event_tasks
      .filter(t => !isTaskExcluded(t.status)) // Exclude cancelled tasks
      .map(t => ({
        id: t.id,
        status: t.status,
        due_date: t.due_date
      })),
    eventDate
  )

  const preEventTaskIds = new Set(preEventTasks.map(t => t.id))

  return event.event_tasks.filter(
    task => preEventTaskIds.has(task.id) && !isTaskCompleted(task.status) && !isTaskExcluded(task.status)
  )
}

/**
 * Get completed tasks for an event
 */
export function getCompletedEventTasks(event: Event): EventTask[] {
  if (!event.event_tasks) {
    return []
  }

  return event.event_tasks.filter(task => isTaskCompleted(task.status))
}

/**
 * Hook to get event readiness for a single event
 * Fetches fresh data from the tasks API
 *
 * @param eventId - The event ID to get readiness for
 * @param options - Query options
 */
export function useEventReadiness(
  eventId: string | null | undefined,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled !== false && !!eventId

  return useQuery({
    queryKey: ['event-readiness', eventId],
    queryFn: async (): Promise<EventReadiness> => {
      if (!eventId) {
        return {
          total: 0,
          completed: 0,
          percentage: 0,
          isReady: false,
          hasTasks: false
        }
      }

      // Fetch tasks for this event
      const response = await fetch(
        `/api/tasks?entityType=event&entityId=${eventId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch event tasks')
      }

      const tasks = await response.json() as TaskForReadiness[]
      return calculateEventReadiness(tasks)
    },
    enabled,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

/**
 * Hook to get task progress for use in components
 * Returns a formatted object matching the taskProgress interface used by EventTimelineCard
 *
 * @param event - The event object
 */
export function useTaskProgress(event: Event): {
  completed: number
  total: number
  percentage: number
} {
  return useMemo(() => {
    const readiness = getEventReadiness(event)
    return {
      completed: readiness.completed,
      total: readiness.total,
      percentage: readiness.percentage
    }
  }, [event.task_readiness, event.event_tasks])
}

/**
 * Calculate task progress from event for direct use in components
 * Does not use hooks - useful for non-hook contexts
 */
export function calculateTaskProgress(event: Event): {
  completed: number
  total: number
  percentage: number
} {
  const readiness = getEventReadiness(event)
  return {
    completed: readiness.completed,
    total: readiness.total,
    percentage: readiness.percentage
  }
}
