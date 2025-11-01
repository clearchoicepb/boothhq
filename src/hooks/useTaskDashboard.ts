/**
 * Task Dashboard Hook
 * Specialized hook for department dashboards
 *
 * Provides:
 * - Task lists with computed urgency
 * - Department statistics
 * - Team member workload data
 * - Filtered and grouped views
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { tasksService } from '@/lib/api/services/tasksService'
import type { DepartmentId } from '@/lib/departments'
import type { TaskListOptions, TaskWithUrgency } from '@/types/tasks'
import { enrichTaskWithUrgency } from '@/types/tasks'

/**
 * Hook for fetching dashboard data for a department
 *
 * Returns:
 * - stats: Department statistics
 * - tasks: Tasks with urgency information
 * - team_members: Team members and their workloads
 *
 * @param departmentId - Department ID
 * @param userId - Optional user ID to filter to "My Tasks"
 * @param enabled - Whether to enable the query
 *
 * @example
 * const { data, isLoading } = useTaskDashboard('design')
 */
export function useTaskDashboard(
  departmentId: DepartmentId | null,
  userId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'dashboard', departmentId, userId],
    queryFn: () => tasksService.getDashboardData(departmentId!, userId),
    enabled: enabled && !!departmentId,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook for fetching tasks grouped by urgency
 *
 * Returns tasks organized by:
 * - overdue
 * - today
 * - this_week
 * - this_month
 * - future
 * - no_due_date
 *
 * @param options - Filter options
 * @param enabled - Whether to enable the query
 *
 * @example
 * const { byUrgency, isLoading } = useTasksByUrgency({ department: 'design' })
 *
 * // Use in component
 * byUrgency.overdue.forEach(task => ...)
 */
export function useTasksByUrgency(
  options: TaskListOptions = {},
  enabled: boolean = true
) {
  const tasksQuery = useQuery({
    queryKey: ['tasks', options],
    queryFn: () => tasksService.list(options),
    enabled,
    staleTime: 30000,
  })

  const byUrgency = useMemo(() => {
    if (!tasksQuery.data) {
      return {
        overdue: [],
        today: [],
        this_week: [],
        this_month: [],
        future: [],
        no_due_date: [],
      }
    }

    const tasksWithUrgency = tasksQuery.data.map(enrichTaskWithUrgency)

    return {
      overdue: tasksWithUrgency.filter(t => t.urgency === 'overdue'),
      today: tasksWithUrgency.filter(t => t.urgency === 'today'),
      this_week: tasksWithUrgency.filter(t => t.urgency === 'this_week'),
      this_month: tasksWithUrgency.filter(t => t.urgency === 'this_month'),
      future: tasksWithUrgency.filter(t => t.urgency === 'future'),
      no_due_date: tasksWithUrgency.filter(t => t.urgency === 'no_due_date'),
    }
  }, [tasksQuery.data])

  return {
    ...tasksQuery,
    byUrgency,
  }
}

/**
 * Hook for fetching tasks grouped by priority
 *
 * @param options - Filter options
 * @param enabled - Whether to enable the query
 *
 * @example
 * const { byPriority } = useTasksByPriority({ department: 'sales' })
 */
export function useTasksByPriority(
  options: TaskListOptions = {},
  enabled: boolean = true
) {
  const tasksQuery = useQuery({
    queryKey: ['tasks', options],
    queryFn: () => tasksService.list(options),
    enabled,
    staleTime: 30000,
  })

  const byPriority = useMemo(() => {
    if (!tasksQuery.data) {
      return {
        urgent: [],
        high: [],
        medium: [],
        low: [],
      }
    }

    return {
      urgent: tasksQuery.data.filter(t => t.priority === 'urgent'),
      high: tasksQuery.data.filter(t => t.priority === 'high'),
      medium: tasksQuery.data.filter(t => t.priority === 'medium'),
      low: tasksQuery.data.filter(t => t.priority === 'low'),
    }
  }, [tasksQuery.data])

  return {
    ...tasksQuery,
    byPriority,
  }
}

/**
 * Hook for fetching tasks grouped by status
 *
 * @param options - Filter options
 * @param enabled - Whether to enable the query
 *
 * @example
 * const { byStatus } = useTasksByStatus({ assignedTo: userId })
 */
export function useTasksByStatus(
  options: TaskListOptions = {},
  enabled: boolean = true
) {
  const tasksQuery = useQuery({
    queryKey: ['tasks', options],
    queryFn: () => tasksService.list(options),
    enabled,
    staleTime: 30000,
  })

  const byStatus = useMemo(() => {
    if (!tasksQuery.data) {
      return {
        pending: [],
        in_progress: [],
        completed: [],
        cancelled: [],
      }
    }

    return {
      pending: tasksQuery.data.filter(t => t.status === 'pending'),
      in_progress: tasksQuery.data.filter(t => t.status === 'in_progress'),
      completed: tasksQuery.data.filter(t => t.status === 'completed'),
      cancelled: tasksQuery.data.filter(t => t.status === 'cancelled'),
    }
  }, [tasksQuery.data])

  return {
    ...tasksQuery,
    byStatus,
  }
}

/**
 * Hook for fetching tasks grouped by assignee
 *
 * Useful for supervisor views showing team workload
 *
 * @param options - Filter options
 * @param enabled - Whether to enable the query
 *
 * @example
 * const { byAssignee } = useTasksByAssignee({ department: 'operations' })
 */
export function useTasksByAssignee(
  options: TaskListOptions = {},
  enabled: boolean = true
) {
  const tasksQuery = useQuery({
    queryKey: ['tasks', options],
    queryFn: () => tasksService.list(options),
    enabled,
    staleTime: 30000,
  })

  const byAssignee = useMemo(() => {
    if (!tasksQuery.data) {
      return {
        assigned: new Map<string, TaskWithUrgency[]>(),
        unassigned: [],
      }
    }

    const tasksWithUrgency = tasksQuery.data.map(enrichTaskWithUrgency)
    const assigned = new Map<string, TaskWithUrgency[]>()
    const unassigned: TaskWithUrgency[] = []

    tasksWithUrgency.forEach(task => {
      if (task.assigned_to && task.assigned_to_user) {
        const userId = task.assigned_to
        const userName = `${task.assigned_to_user.first_name} ${task.assigned_to_user.last_name}`

        if (!assigned.has(userId)) {
          assigned.set(userId, [])
        }
        assigned.get(userId)!.push(task)
      } else {
        unassigned.push(task)
      }
    })

    return { assigned, unassigned }
  }, [tasksQuery.data])

  // Convert Map to array for easier rendering
  const assignedArray = useMemo(() => {
    return Array.from(byAssignee.assigned.entries()).map(([userId, tasks]) => ({
      userId,
      userName: tasks[0]?.assigned_to_user
        ? `${tasks[0].assigned_to_user.first_name} ${tasks[0].assigned_to_user.last_name}`
        : 'Unknown',
      tasks,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      overdueTasks: tasks.filter(t => t.urgency === 'overdue').length,
    }))
  }, [byAssignee.assigned])

  return {
    ...tasksQuery,
    byAssignee,
    assignedArray,
  }
}

/**
 * Hook for fetching "My Tasks" with all groupings
 * Convenience hook that combines multiple views for a user's personal dashboard
 *
 * @param userId - User ID
 * @param enabled - Whether to enable the query
 *
 * @example
 * const myTasks = useMyTasks(session.user.id)
 *
 * // Access grouped data
 * myTasks.byUrgency.overdue
 * myTasks.byPriority.urgent
 * myTasks.byStatus.pending
 */
export function useMyTasks(userId: string | null, enabled: boolean = true) {
  const options: TaskListOptions = userId ? { assignedTo: userId } : {}

  const tasksQuery = useQuery({
    queryKey: ['tasks', 'my-tasks', userId],
    queryFn: () => tasksService.getByUser(userId!, options),
    enabled: enabled && !!userId,
    staleTime: 30000,
  })

  const tasksWithUrgency = useMemo(() => {
    return tasksQuery.data?.map(enrichTaskWithUrgency) || []
  }, [tasksQuery.data])

  const byUrgency = useMemo(() => ({
    overdue: tasksWithUrgency.filter(t => t.urgency === 'overdue'),
    today: tasksWithUrgency.filter(t => t.urgency === 'today'),
    this_week: tasksWithUrgency.filter(t => t.urgency === 'this_week'),
    this_month: tasksWithUrgency.filter(t => t.urgency === 'this_month'),
    future: tasksWithUrgency.filter(t => t.urgency === 'future'),
    no_due_date: tasksWithUrgency.filter(t => t.urgency === 'no_due_date'),
  }), [tasksWithUrgency])

  const byPriority = useMemo(() => ({
    urgent: tasksWithUrgency.filter(t => t.priority === 'urgent'),
    high: tasksWithUrgency.filter(t => t.priority === 'high'),
    medium: tasksWithUrgency.filter(t => t.priority === 'medium'),
    low: tasksWithUrgency.filter(t => t.priority === 'low'),
  }), [tasksWithUrgency])

  const byStatus = useMemo(() => ({
    pending: tasksWithUrgency.filter(t => t.status === 'pending'),
    in_progress: tasksWithUrgency.filter(t => t.status === 'in_progress'),
    completed: tasksWithUrgency.filter(t => t.status === 'completed'),
    cancelled: tasksWithUrgency.filter(t => t.status === 'cancelled'),
  }), [tasksWithUrgency])

  return {
    ...tasksQuery,
    tasks: tasksWithUrgency,
    byUrgency,
    byPriority,
    byStatus,
  }
}
