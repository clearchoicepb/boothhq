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
  isTaskCompleted,
  type EventReadiness,
  type TaskForReadiness
} from '@/lib/utils/event-readiness'
import type { Event, EventTask } from '@/types/events'

/**
 * Get event readiness from an Event object
 * Uses pre-calculated task_readiness if available, otherwise calculates from event_tasks
 */
export function getEventReadiness(event: Event): EventReadiness {
  // If we have pre-calculated readiness from the API, use it
  if (event.task_readiness) {
    return event.task_readiness
  }

  // Otherwise calculate from event_tasks
  if (event.event_tasks && event.event_tasks.length > 0) {
    return calculateEventReadiness(event.event_tasks as TaskForReadiness[])
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
 * Get incomplete tasks for an event
 * Useful for displaying which tasks need completion
 */
export function getIncompleteEventTasks(event: Event): EventTask[] {
  if (!event.event_tasks) {
    return []
  }

  return event.event_tasks.filter(task => !isTaskCompleted(task.status))
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
