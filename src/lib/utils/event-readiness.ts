/**
 * Event Readiness Utility Functions
 *
 * Calculates event readiness based on the Tasks table.
 * Replaces the old Core Tasks system.
 *
 * A task is considered "completed" if status is 'completed' OR 'approved'
 */

import type { TaskStatus } from '@/types/tasks'

/**
 * Interface representing a task for readiness calculation
 */
export interface TaskForReadiness {
  id: string
  status: TaskStatus | string
  entity_type?: string | null
  entity_id?: string | null
}

/**
 * Event readiness result
 */
export interface EventReadiness {
  /** Total number of tasks for this event */
  total: number
  /** Number of completed tasks */
  completed: number
  /** Percentage complete (0-100) */
  percentage: number
  /** Whether the event is considered ready (100% or no tasks) */
  isReady: boolean
  /** Whether the event has any tasks */
  hasTasks: boolean
}

/**
 * Task statuses that count as "completed" for readiness calculation
 */
export const COMPLETED_STATUSES: Set<string> = new Set(['completed', 'approved'])

/**
 * Check if a task status counts as completed
 */
export function isTaskCompleted(status: TaskStatus | string): boolean {
  return COMPLETED_STATUSES.has(status)
}

/**
 * Calculate event readiness from an array of tasks
 *
 * @param tasks - Array of tasks associated with the event
 * @returns EventReadiness object with counts and percentage
 *
 * @example
 * const tasks = await supabase.from('tasks')
 *   .select('id, status')
 *   .eq('entity_type', 'event')
 *   .eq('entity_id', eventId)
 *
 * const readiness = calculateEventReadiness(tasks.data)
 * console.log(readiness.percentage) // 75
 * console.log(readiness.isReady) // false
 */
export function calculateEventReadiness(tasks: TaskForReadiness[]): EventReadiness {
  const total = tasks.length

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      percentage: 0,
      isReady: false, // No tasks means not ready (or could be true depending on business logic)
      hasTasks: false
    }
  }

  const completed = tasks.filter(task => isTaskCompleted(task.status)).length
  const percentage = Math.round((completed / total) * 100)
  const isReady = completed === total

  return {
    total,
    completed,
    percentage,
    isReady,
    hasTasks: true
  }
}

/**
 * Calculate readiness for multiple events at once
 *
 * @param tasks - Array of all tasks with entity_id
 * @param eventIds - Array of event IDs to calculate readiness for
 * @returns Map of eventId to EventReadiness
 *
 * @example
 * const tasks = await supabase.from('tasks')
 *   .select('id, status, entity_id')
 *   .eq('entity_type', 'event')
 *   .in('entity_id', eventIds)
 *
 * const readinessMap = calculateBulkEventReadiness(tasks.data, eventIds)
 * readinessMap['event-123'] // { total: 5, completed: 3, percentage: 60, ... }
 */
export function calculateBulkEventReadiness(
  tasks: TaskForReadiness[],
  eventIds: string[]
): Record<string, EventReadiness> {
  // Group tasks by event_id
  const tasksByEvent: Record<string, TaskForReadiness[]> = {}

  // Initialize with empty arrays for all events
  for (const eventId of eventIds) {
    tasksByEvent[eventId] = []
  }

  // Group tasks
  for (const task of tasks) {
    if (task.entity_id && tasksByEvent[task.entity_id]) {
      tasksByEvent[task.entity_id].push(task)
    }
  }

  // Calculate readiness for each event
  const result: Record<string, EventReadiness> = {}
  for (const eventId of eventIds) {
    result[eventId] = calculateEventReadiness(tasksByEvent[eventId] || [])
  }

  return result
}

/**
 * Get tasks that are incomplete for an event
 * Useful for filtering/displaying incomplete tasks
 *
 * @param tasks - Array of tasks for the event
 * @returns Array of incomplete tasks
 */
export function getIncompleteTasks(tasks: TaskForReadiness[]): TaskForReadiness[] {
  return tasks.filter(task => !isTaskCompleted(task.status))
}

/**
 * Get completed tasks for an event
 *
 * @param tasks - Array of tasks for the event
 * @returns Array of completed tasks
 */
export function getCompletedTasks(tasks: TaskForReadiness[]): TaskForReadiness[] {
  return tasks.filter(task => isTaskCompleted(task.status))
}
