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
  due_date?: string | null
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
 * Filter tasks to only include pre-event tasks
 * Pre-event tasks are those with due_date on or before the event date
 * Tasks with no due_date are included (assumed to be pre-event)
 *
 * @param tasks - Array of tasks to filter
 * @param eventDate - The event date to compare against (YYYY-MM-DD or ISO string)
 * @returns Array of pre-event tasks only
 */
export function filterPreEventTasks(
  tasks: TaskForReadiness[],
  eventDate?: string | null
): TaskForReadiness[] {
  // If no event date provided, include all tasks
  if (!eventDate) {
    return tasks
  }

  // Normalize event date (add local midnight if needed to avoid timezone issues)
  const normalizedEventDate = eventDate.includes('T') ? eventDate : `${eventDate}T00:00:00`
  const eventDateObj = new Date(normalizedEventDate)

  return tasks.filter(task => {
    // Tasks with no due_date are included (assumed to be pre-event)
    if (!task.due_date) {
      return true
    }

    // Normalize task due date
    const normalizedDueDate = task.due_date.includes('T') ? task.due_date : `${task.due_date}T00:00:00`
    const dueDate = new Date(normalizedDueDate)

    // Include tasks with due_date on or before event date
    return dueDate <= eventDateObj
  })
}

/**
 * Calculate event readiness from an array of tasks
 * Only counts pre-event tasks (tasks with due_date on or before the event date)
 *
 * @param tasks - Array of tasks associated with the event
 * @param eventDate - Optional event date to filter pre-event tasks only
 * @returns EventReadiness object with counts and percentage
 *
 * @example
 * const tasks = await supabase.from('tasks')
 *   .select('id, status, due_date')
 *   .eq('entity_type', 'event')
 *   .eq('entity_id', eventId)
 *
 * const readiness = calculateEventReadiness(tasks.data, '2026-01-15')
 * console.log(readiness.percentage) // 75
 * console.log(readiness.isReady) // false
 */
export function calculateEventReadiness(
  tasks: TaskForReadiness[],
  eventDate?: string | null
): EventReadiness {
  // Filter to only pre-event tasks
  const preEventTasks = filterPreEventTasks(tasks, eventDate)
  const total = preEventTasks.length

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      percentage: 0,
      isReady: false, // No tasks means not ready (or could be true depending on business logic)
      hasTasks: false
    }
  }

  const completed = preEventTasks.filter(task => isTaskCompleted(task.status)).length
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
 * Only counts pre-event tasks (tasks with due_date on or before the event date)
 *
 * @param tasks - Array of all tasks with entity_id and due_date
 * @param eventIds - Array of event IDs to calculate readiness for
 * @param eventDates - Optional map of eventId to event date (first event date)
 * @returns Map of eventId to EventReadiness
 *
 * @example
 * const tasks = await supabase.from('tasks')
 *   .select('id, status, entity_id, due_date')
 *   .eq('entity_type', 'event')
 *   .in('entity_id', eventIds)
 *
 * const eventDates = { 'event-123': '2026-01-15', 'event-456': '2026-02-20' }
 * const readinessMap = calculateBulkEventReadiness(tasks.data, eventIds, eventDates)
 * readinessMap['event-123'] // { total: 5, completed: 3, percentage: 60, ... }
 */
export function calculateBulkEventReadiness(
  tasks: TaskForReadiness[],
  eventIds: string[],
  eventDates?: Record<string, string | null>
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

  // Calculate readiness for each event (only pre-event tasks)
  const result: Record<string, EventReadiness> = {}
  for (const eventId of eventIds) {
    const eventDate = eventDates?.[eventId] || null
    result[eventId] = calculateEventReadiness(tasksByEvent[eventId] || [], eventDate)
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
