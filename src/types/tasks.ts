/**
 * Task Type Definitions
 *
 * Comprehensive type system for the task management feature.
 * Follows the same pattern as Events module for consistency.
 */

import type { DepartmentId, DepartmentRole } from '@/lib/departments'

/**
 * Base Task type - matches database schema
 */
export interface Task {
  id: string
  tenant_id: string
  title: string
  description: string | null
  assigned_to: string | null
  created_by: string
  entity_type: string | null
  entity_id: string | null
  event_date_id: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  department: DepartmentId | null
  task_type: string | null // References DepartmentTaskType.id
}

/**
 * Task with related user and entity information
 */
export interface TaskWithRelations extends Task {
  assigned_to_user: {
    id: string
    first_name: string
    last_name: string
    email: string
    department: DepartmentId | null
    department_role: DepartmentRole | null
  } | null
  created_by_user: {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null
  event_date: {
    id: string
    event_date: string
  } | null
}

/**
 * Task status enum
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Task priority enum
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * Task insert type for creating new tasks
 */
export interface TaskInsert {
  title: string
  description?: string | null
  assignedTo?: string | null
  entityType?: string | null
  entityId?: string | null
  eventDateId?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  department?: DepartmentId | null
  taskType?: string | null
}

/**
 * Task update type for partial updates
 */
export interface TaskUpdate {
  title?: string
  description?: string | null
  assigned_to?: string | null
  entity_type?: string | null
  entity_id?: string | null
  event_date_id?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  completed_at?: string | null
  department?: DepartmentId | null
  task_type?: string | null
}

/**
 * Task filters for API queries
 */
export interface TaskFilters {
  entityType?: string
  entityId?: string
  assignedTo?: string
  createdBy?: string
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  department?: DepartmentId | 'all'
  taskType?: string
  dueDateFrom?: string
  dueDateTo?: string
  search?: string
  page?: number
  limit?: number
}

/**
 * Dashboard statistics for a department
 */
export interface TaskDashboardStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
  due_today: number
  due_this_week: number
  by_priority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  by_assignee: Array<{
    user_id: string
    user_name: string
    count: number
  }>
}

/**
 * Dashboard data response
 */
export interface TaskDashboardData {
  stats: TaskDashboardStats
  tasks: TaskWithRelations[]
  team_members?: Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    department: DepartmentId | null
    department_role: DepartmentRole | null
    active_tasks: number
    overdue_tasks: number
  }>
}

/**
 * Task list options for service calls
 */
export interface TaskListOptions extends TaskFilters {
  sort_by?: 'created_at' | 'due_date' | 'priority' | 'status' | 'title'
  sort_order?: 'asc' | 'desc'
}

/**
 * Task urgency classification (computed from due_date)
 */
export type TaskUrgency = 'overdue' | 'today' | 'this_week' | 'this_month' | 'future' | 'no_due_date'

/**
 * Task with computed urgency
 */
export interface TaskWithUrgency extends TaskWithRelations {
  urgency: TaskUrgency
  days_until_due: number | null
}

/**
 * Task template for auto-creation
 */
export interface TaskTemplate {
  id: string
  tenant_id: string
  department: DepartmentId
  task_type: string
  title_template: string
  description_template: string | null
  default_priority: TaskPriority
  trigger_event: string // 'event_created', 'opportunity_won', etc.
  trigger_conditions: Record<string, any> | null
  due_date_offset_days: number | null
  auto_assign_to: 'owner' | 'department_default' | string | null
  created_at: string
}

/**
 * Task comment for collaboration
 */
export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Task history entry for audit log
 */
export interface TaskHistory {
  id: string
  task_id: string
  user_id: string
  action: TaskAction
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  created_at: string
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Task action types for history
 */
export type TaskAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'priority_changed'
  | 'reassigned'
  | 'completed'
  | 'cancelled'
  | 'deleted'
  | 'comment_added'

/**
 * Utility type guards
 */
export function isTaskStatus(value: string): value is TaskStatus {
  return ['pending', 'in_progress', 'completed', 'cancelled'].includes(value)
}

export function isTaskPriority(value: string): value is TaskPriority {
  return ['low', 'medium', 'high', 'urgent'].includes(value)
}

/**
 * Calculate task urgency from due date
 */
export function calculateTaskUrgency(dueDate: string | null): TaskUrgency {
  if (!dueDate) return 'no_due_date'

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diff = due.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'this_week'
  if (days <= 30) return 'this_month'
  return 'future'
}

/**
 * Calculate days until due
 */
export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Add urgency information to tasks
 */
export function enrichTaskWithUrgency(task: TaskWithRelations): TaskWithUrgency {
  return {
    ...task,
    urgency: calculateTaskUrgency(task.due_date),
    days_until_due: getDaysUntilDue(task.due_date),
  }
}
