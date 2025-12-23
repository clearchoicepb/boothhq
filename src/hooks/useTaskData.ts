/**
 * Task Data Hook
 * React Query hook for fetching task data
 *
 * Following the same pattern as useEventData.ts:
 * - Uses React Query for caching and automatic refetching
 * - Provides loading states and error handling
 * - Integrates with tasksService for all API calls
 */

import { useQuery } from '@tanstack/react-query'
import { tasksService } from '@/lib/api/services/tasksService'
import type { TaskListOptions, TaskWithRelations } from '@/types/tasks'
import type { DepartmentId } from '@/lib/departments'

/**
 * Hook for fetching a list of tasks with filters
 *
 * @param options - Filter and pagination options
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * // Get all tasks for design department
 * const { data: tasks, isLoading } = useTasks({ department: 'design' })
 *
 * @example
 * // Get user's tasks
 * const { data: tasks, isLoading } = useTasks({ assignedTo: userId })
 */
export function useTasks(options: TaskListOptions = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tasks', options],
    queryFn: () => tasksService.list(options),
    enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook for fetching a single task by ID
 *
 * @param taskId - Task ID
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: task, isLoading } = useTask(taskId)
 */
export function useTask(taskId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksService.getById(taskId),
    enabled: enabled && !!taskId,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching tasks for a specific department
 *
 * @param departmentId - Department ID
 * @param filters - Additional filters
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: tasks, isLoading } = useDepartmentTasks('design', { status: 'pending' })
 */
export function useDepartmentTasks(
  departmentId: DepartmentId | null,
  filters: Omit<TaskListOptions, 'department'> = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'department', departmentId, filters],
    queryFn: () => tasksService.getByDepartment(departmentId!, filters),
    enabled: enabled && !!departmentId,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching tasks assigned to a specific user
 *
 * @param userId - User ID
 * @param filters - Additional filters
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: tasks, isLoading } = useUserTasks(session.user.id, { status: 'pending' })
 */
export function useUserTasks(
  userId: string | null,
  filters: Omit<TaskListOptions, 'assignedTo'> = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'user', userId, filters],
    queryFn: () => tasksService.getByUser(userId!, filters),
    enabled: enabled && !!userId,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching tasks for a specific entity
 *
 * @param entityType - Entity type (e.g., 'opportunity', 'event')
 * @param entityId - Entity ID
 * @param filters - Additional filters
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: tasks, isLoading } = useEntityTasks('opportunity', opportunityId)
 */
export function useEntityTasks(
  entityType: string | null,
  entityId: string | null,
  filters: Omit<TaskListOptions, 'entityType' | 'entityId'> = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'entity', entityType, entityId, filters],
    queryFn: () => tasksService.getByEntity(entityType!, entityId!, filters),
    enabled: enabled && !!entityType && !!entityId,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching overdue tasks
 *
 * @param filters - Additional filters
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: overdueTasks } = useOverdueTasks({ department: 'sales' })
 */
export function useOverdueTasks(
  filters: TaskListOptions = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'overdue', filters],
    queryFn: () => tasksService.getOverdue(filters),
    enabled,
    staleTime: 60000, // 1 minute (overdue status changes slowly)
  })
}

/**
 * Hook for fetching tasks due today
 *
 * @param filters - Additional filters
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: todayTasks } = useTodayTasks({ assignedTo: userId })
 */
export function useTodayTasks(
  filters: TaskListOptions = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'today', filters],
    queryFn: () => tasksService.getDueToday(filters),
    enabled,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Hook for fetching tasks due this week
 *
 * @param filters - Additional filters
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: weekTasks } = useWeekTasks({ department: 'operations' })
 */
export function useWeekTasks(
  filters: TaskListOptions = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'week', filters],
    queryFn: () => tasksService.getDueThisWeek(filters),
    enabled,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Hook for fetching task statistics
 *
 * @param departmentId - Optional department ID to filter stats
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: stats } = useTaskStats('design')
 */
export function useTaskStats(
  departmentId?: DepartmentId,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'stats', departmentId],
    queryFn: () => tasksService.getStats(departmentId),
    enabled,
    staleTime: 60000, // 1 minute
  })
}

// =========================================================================
// SUBTASK HOOKS (added 2025-12-23)
// =========================================================================

/**
 * Hook for fetching subtasks of a parent task
 *
 * @param parentTaskId - Parent task ID
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: subtasks, isLoading } = useSubtasks(taskId)
 */
export function useSubtasks(
  parentTaskId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'subtasks', parentTaskId],
    queryFn: () => tasksService.getSubtasks(parentTaskId!),
    enabled: enabled && !!parentTaskId,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching a task with its subtasks included
 *
 * @param taskId - Task ID
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: task } = useTaskWithSubtasks(taskId)
 * // task.subtasks contains the subtask array
 * // task.subtask_progress contains { total, completed }
 */
export function useTaskWithSubtasks(
  taskId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', taskId, 'with-subtasks'],
    queryFn: () => tasksService.getById(taskId!, { includeSubtasks: true }),
    enabled: enabled && !!taskId,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching top-level tasks only (excludes subtasks)
 *
 * @param options - Filter options
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: tasks } = useTopLevelTasks({ department: 'design' })
 */
export function useTopLevelTasks(
  options: Omit<TaskListOptions, 'excludeSubtasks'> = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'top-level', options],
    queryFn: () => tasksService.getTopLevelTasks(options),
    enabled,
    staleTime: 30000,
  })
}

/**
 * Hook for fetching tasks with subtask progress (for badge display)
 *
 * @param options - Filter options
 * @param enabled - Whether to enable the query (default: true)
 *
 * @example
 * const { data: tasks } = useTasksWithProgress({ department: 'design' })
 * // Each task has subtask_progress: { total, completed }
 */
export function useTasksWithProgress(
  options: Omit<TaskListOptions, 'includeSubtaskProgress'> = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tasks', 'with-progress', options],
    queryFn: () => tasksService.getTasksWithProgress(options),
    enabled,
    staleTime: 30000,
  })
}
