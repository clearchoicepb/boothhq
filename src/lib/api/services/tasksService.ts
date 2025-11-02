/**
 * Tasks Service
 * Centralized service for all task-related API calls
 *
 * Following the same SOLID architecture as eventsService.ts:
 * - Single Responsibility: Only handles task API communication
 * - Dependency Inversion: Components depend on this abstraction, not fetch()
 * - Open/Closed: Easy to extend with new methods without modifying consumers
 *
 * Benefits:
 * - Type safety with TypeScript
 * - Automatic retry logic via apiClient
 * - Centralized error handling
 * - Easy to test (mock this service)
 * - Easy to add caching, logging, etc. in one place
 */

import { apiClient } from '../apiClient'
import type {
  Task,
  TaskWithRelations,
  TaskInsert,
  TaskUpdate,
  TaskFilters,
  TaskListOptions,
  TaskDashboardData,
  TaskDashboardStats,
} from '@/types/tasks'
import type { DepartmentId } from '@/lib/departments'

/**
 * Task creation response
 */
export interface TaskCreateResponse {
  success: boolean
  task: TaskWithRelations
}

/**
 * Tasks Service Class
 */
class TasksService {
  /**
   * List tasks with filters and pagination
   *
   * @example
   * // Get all pending tasks for design department
   * const tasks = await tasksService.list({
   *   department: 'design',
   *   status: 'pending',
   *   sort_by: 'due_date',
   *   sort_order: 'asc'
   * })
   */
  async list(options: TaskListOptions = {}): Promise<TaskWithRelations[]> {
    const params = new URLSearchParams()

    // Entity filters
    if (options.entityType) params.append('entityType', options.entityType)
    if (options.entityId) params.append('entityId', options.entityId)

    // User filters
    if (options.assignedTo) params.append('assignedTo', options.assignedTo)
    if (options.createdBy) params.append('createdBy', options.createdBy)

    // Status and priority
    if (options.status && options.status !== 'all') {
      params.append('status', options.status)
    }
    if (options.priority && options.priority !== 'all') {
      params.append('priority', options.priority)
    }

    // Department filters
    if (options.department && options.department !== 'all') {
      params.append('department', options.department)
    }
    if (options.taskType) params.append('taskType', options.taskType)

    // Date filters
    if (options.dueDateFrom) params.append('dueDateFrom', options.dueDateFrom)
    if (options.dueDateTo) params.append('dueDateTo', options.dueDateTo)

    // Search
    if (options.search) params.append('search', options.search)

    // Pagination
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    // Sorting
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)

    const queryString = params.toString()
    const url = `/api/tasks${queryString ? `?${queryString}` : ''}`

    return apiClient.get<TaskWithRelations[]>(url)
  }

  /**
   * Get a single task by ID
   *
   * @param id - Task ID
   */
  async getById(id: string): Promise<TaskWithRelations> {
    return apiClient.get<TaskWithRelations>(`/api/tasks/${id}`)
  }

  /**
   * Create a new task
   *
   * @param data - Task data
   * @returns Created task with relations
   *
   * @example
   * const task = await tasksService.create({
   *   title: 'Follow up with client',
   *   department: 'sales',
   *   taskType: 'follow_up_lead',
   *   priority: 'high',
   *   dueDate: '2025-11-05',
   *   assignedTo: 'user-123',
   *   entityType: 'opportunity',
   *   entityId: 'opp-456'
   * })
   */
  async create(data: TaskInsert): Promise<TaskWithRelations> {
    const response = await apiClient.post<TaskCreateResponse>('/api/tasks', data)
    return response.task
  }

  /**
   * Create a task from a template
   *
   * V1: Manual creation via quick-add buttons
   * V2: Can be called automatically by automation triggers
   *
   * @param templateId - ID of the task template
   * @param options - Optional overrides and entity linking
   * @returns Created task with relations
   *
   * @example
   * // Create task from template for an opportunity
   * const task = await tasksService.createFromTemplate({
   *   templateId: 'template-123',
   *   entityType: 'opportunity',
   *   entityId: 'opp-456',
   *   assignedTo: 'user-789'
   * })
   *
   * @example
   * // Override template defaults
   * const task = await tasksService.createFromTemplate({
   *   templateId: 'template-123',
   *   title: 'Custom title',
   *   priority: 'urgent',
   *   dueDate: '2025-11-10'
   * })
   */
  async createFromTemplate(options: {
    templateId: string
    entityType?: string | null
    entityId?: string | null
    eventDateId?: string | null
    assignedTo?: string | null
    // Optional overrides to template defaults
    title?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string | null
  }): Promise<TaskWithRelations> {
    const response = await apiClient.post<TaskCreateResponse>(
      '/api/tasks/from-template',
      options
    )
    return response.task
  }

  /**
   * Update an existing task
   *
   * @param id - Task ID
   * @param data - Partial task data to update
   */
  async update(id: string, data: TaskUpdate): Promise<TaskWithRelations> {
    return apiClient.patch<TaskWithRelations>(`/api/tasks/${id}`, data)
  }

  /**
   * Update task status
   * Convenience method for the common operation of changing status
   *
   * @param id - Task ID
   * @param status - New status
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<TaskWithRelations> {
    const updates: TaskUpdate = { status }

    // Auto-set completed_at when marking as completed
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    // Clear completed_at when moving back to pending/in_progress
    else if (status === 'pending' || status === 'in_progress') {
      updates.completed_at = null
    }

    return this.update(id, updates)
  }

  /**
   * Reassign task to a different user
   *
   * @param id - Task ID
   * @param assignedTo - New assignee user ID (null to unassign)
   */
  async reassign(id: string, assignedTo: string | null): Promise<TaskWithRelations> {
    return this.update(id, { assigned_to: assignedTo })
  }

  /**
   * Update task priority
   *
   * @param id - Task ID
   * @param priority - New priority level
   */
  async updatePriority(
    id: string,
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<TaskWithRelations> {
    return this.update(id, { priority })
  }

  /**
   * Delete a task
   *
   * @param id - Task ID
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/tasks/${id}`)
  }

  /**
   * Get tasks for a specific department
   * Convenience method for department dashboards
   *
   * @param departmentId - Department ID
   * @param filters - Additional filters
   */
  async getByDepartment(
    departmentId: DepartmentId,
    filters: Omit<TaskListOptions, 'department'> = {}
  ): Promise<TaskWithRelations[]> {
    return this.list({
      ...filters,
      department: departmentId,
    })
  }

  /**
   * Get tasks assigned to a specific user
   *
   * @param userId - User ID
   * @param filters - Additional filters
   */
  async getByUser(
    userId: string,
    filters: Omit<TaskListOptions, 'assignedTo'> = {}
  ): Promise<TaskWithRelations[]> {
    return this.list({
      ...filters,
      assignedTo: userId,
    })
  }

  /**
   * Get tasks for a specific entity
   *
   * @param entityType - Entity type (e.g., 'opportunity', 'event')
   * @param entityId - Entity ID
   * @param filters - Additional filters
   */
  async getByEntity(
    entityType: string,
    entityId: string,
    filters: Omit<TaskListOptions, 'entityType' | 'entityId'> = {}
  ): Promise<TaskWithRelations[]> {
    return this.list({
      ...filters,
      entityType,
      entityId,
    })
  }

  /**
   * Get dashboard data for a department
   * Returns tasks + statistics for department dashboard
   *
   * @param departmentId - Department ID
   * @param userId - Optional user ID to filter tasks (for "My Tasks" view)
   */
  async getDashboardData(
    departmentId: DepartmentId,
    userId?: string
  ): Promise<TaskDashboardData> {
    const params = new URLSearchParams({ department: departmentId })
    if (userId) params.append('assignedTo', userId)

    return apiClient.get<TaskDashboardData>(
      `/api/tasks/dashboard?${params.toString()}`
    )
  }

  /**
   * Get statistics for a department
   * Returns only stats without tasks list
   *
   * @param departmentId - Department ID
   */
  async getStats(departmentId?: DepartmentId): Promise<TaskDashboardStats> {
    const params = new URLSearchParams()
    if (departmentId) params.append('department', departmentId)

    return apiClient.get<TaskDashboardStats>(
      `/api/tasks/stats${params.toString() ? `?${params}` : ''}`
    )
  }

  /**
   * Get overdue tasks
   * Returns all tasks with due_date before today
   *
   * @param filters - Additional filters (e.g., department, assignedTo)
   */
  async getOverdue(filters: TaskListOptions = {}): Promise<TaskWithRelations[]> {
    const today = new Date().toISOString().split('T')[0]

    return this.list({
      ...filters,
      dueDateTo: today,
      status: 'pending', // Only pending/in_progress tasks can be overdue
    })
  }

  /**
   * Get tasks due today
   *
   * @param filters - Additional filters
   */
  async getDueToday(filters: TaskListOptions = {}): Promise<TaskWithRelations[]> {
    const today = new Date().toISOString().split('T')[0]

    return this.list({
      ...filters,
      dueDateFrom: today,
      dueDateTo: today,
    })
  }

  /**
   * Get tasks due this week
   *
   * @param filters - Additional filters
   */
  async getDueThisWeek(filters: TaskListOptions = {}): Promise<TaskWithRelations[]> {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return this.list({
      ...filters,
      dueDateFrom: today.toISOString().split('T')[0],
      dueDateTo: nextWeek.toISOString().split('T')[0],
    })
  }

  /**
   * Bulk update tasks
   * Update multiple tasks at once (e.g., reassign multiple tasks)
   *
   * @param taskIds - Array of task IDs
   * @param updates - Updates to apply to all tasks
   */
  async bulkUpdate(
    taskIds: string[],
    updates: TaskUpdate
  ): Promise<TaskWithRelations[]> {
    return apiClient.post<TaskWithRelations[]>('/api/tasks/bulk-update', {
      taskIds,
      updates,
    })
  }

  /**
   * Bulk delete tasks
   *
   * @param taskIds - Array of task IDs to delete
   */
  async bulkDelete(taskIds: string[]): Promise<void> {
    return apiClient.post('/api/tasks/bulk-delete', { taskIds })
  }
}

// Export singleton instance
export const tasksService = new TasksService()

// Also export the class for testing/mocking
export { TasksService }
