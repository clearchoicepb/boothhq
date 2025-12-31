/**
 * Task Type Definitions
 *
 * Comprehensive type system for the unified task management feature.
 * Supports all task types: general, design, operations, sales, admin, project, misc
 *
 * Follows the same pattern as Events module for consistency.
 */

import type { DepartmentId, DepartmentRole } from '@/lib/departments'

/**
 * Unified task type - categorizes tasks
 * Includes department-based types (design, operations, sales, admin, accounting, customer_success)
 * Plus general categories (general, project, misc)
 */
export type UnifiedTaskType = 'general' | 'design' | 'operations' | 'sales' | 'admin' | 'accounting' | 'customer_success' | 'project' | 'misc'

/**
 * Task timing relative to event date
 * - pre_event: Must be completed before event (marked missed if not)
 * - post_event: Done after event (never marked missed)
 * - general: No event timing relationship
 */
export type TaskTiming = 'pre_event' | 'post_event' | 'general'

/**
 * Base Task type - matches database schema (unified model)
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
  project_id: string | null // Direct FK to projects table (for internal project tasks)
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  department: DepartmentId | null
  task_type: UnifiedTaskType | string | null // 'general', 'design', 'operations', etc.
  task_template_id: string | null // Reference to task template

  // Design-specific fields (populated when task_type = 'design')
  quantity: number | null
  revision_count: number | null
  design_file_urls: string[] | null
  proof_file_urls: string[] | null
  final_file_urls: string[] | null
  client_notes: string | null
  internal_notes: string | null
  design_deadline: string | null
  design_start_date: string | null
  product_id: string | null

  // Approval workflow fields
  requires_approval: boolean
  approved_by: string | null
  approval_notes: string | null
  submitted_for_approval_at: string | null
  approved_at: string | null

  // Timeline tracking
  assigned_at: string | null
  started_at: string | null

  // Workflow tracking
  auto_created: boolean | null
  workflow_id: string | null
  workflow_execution_id: string | null

  // Migration tracking
  migrated_from_table: string | null
  migrated_from_id: string | null

  // Subtask hierarchy (added 2025-12-23)
  parent_task_id: string | null // NULL = top-level task, NOT NULL = subtask
  display_order: number // Order within parent's subtasks, default 0

  // Task timing (added 2025-12-31)
  task_timing: TaskTiming // pre_event, post_event, or general
  missed: boolean // True if pre-event task not completed before event
  missed_at: string | null // When task was marked as missed
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
  project: {
    id: string
    name: string
    target_date: string | null
  } | null
  // Event info (populated when entity_type='event')
  event?: {
    id: string
    title: string
    event_number: string | null
    start_date: string | null
  } | null
  // Subtasks (populated when fetching a parent task with its children)
  subtasks?: TaskWithRelations[]
  // Subtask progress (computed, for display in list views)
  subtask_progress?: SubtaskProgress
}

/**
 * Subtask progress for parent task display
 * Shows "X/Y done" badge in task lists
 */
export interface SubtaskProgress {
  total: number
  completed: number // status = 'completed' or 'approved'
}

/**
 * Task status enum (unified model)
 * Includes design workflow statuses: awaiting_approval, needs_revision, approved
 */
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_approval'
  | 'needs_revision'
  | 'approved'
  | 'completed'
  | 'cancelled'

/**
 * Task priority enum
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * Task insert type for creating new tasks (unified model)
 */
export interface TaskInsert {
  title: string
  description?: string | null
  assignedTo?: string | null
  entityType?: string | null
  entityId?: string | null
  eventDateId?: string | null
  projectId?: string | null // Direct FK to projects (for internal project tasks)
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  department?: DepartmentId | null
  taskType?: UnifiedTaskType | string | null
  taskTemplateId?: string | null

  // Subtask creation (added 2025-12-23)
  parentTaskId?: string | null // If provided, creates as subtask of this task
  displayOrder?: number // Order within parent's subtasks

  // Task timing (added 2025-12-31)
  taskTiming?: TaskTiming // pre_event, post_event, or general

  // Design-specific fields
  quantity?: number
  requiresApproval?: boolean
  designDeadline?: string | null
  designStartDate?: string | null
  productId?: string | null
  clientNotes?: string | null
  internalNotes?: string | null
}

/**
 * Task update type for partial updates (unified model)
 */
export interface TaskUpdate {
  title?: string
  description?: string | null
  assigned_to?: string | null
  entity_type?: string | null
  entity_id?: string | null
  event_date_id?: string | null
  project_id?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  completed_at?: string | null
  department?: DepartmentId | null
  task_type?: UnifiedTaskType | string | null

  // Design-specific updates
  quantity?: number
  revision_count?: number
  design_file_urls?: string[]
  proof_file_urls?: string[]
  final_file_urls?: string[]
  client_notes?: string | null
  internal_notes?: string | null
  design_deadline?: string | null
  design_start_date?: string | null
  product_id?: string | null

  // Approval workflow
  requires_approval?: boolean
  approval_notes?: string | null
  submitted_for_approval_at?: string | null
  approved_at?: string | null
  approved_by?: string | null

  // Timeline
  assigned_at?: string | null
  started_at?: string | null

  // Subtask updates (added 2025-12-23)
  parent_task_id?: string | null // Move to different parent or promote to top-level
  display_order?: number // Reorder within parent

  // Task timing (added 2025-12-31)
  task_timing?: TaskTiming
  missed?: boolean
  missed_at?: string | null
}

/**
 * Task filters for API queries
 */
export interface TaskFilters {
  entityType?: string
  entityId?: string
  projectId?: string // Direct FK filter for project tasks
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

  // Subtask filters (added 2025-12-23)
  parentTaskId?: string // Filter to subtasks of a specific parent
  excludeSubtasks?: boolean // If true, only return top-level tasks (parent_task_id IS NULL)
  includeSubtaskProgress?: boolean // If true, compute subtask_progress for each task

  // Task timing filters (added 2025-12-31)
  taskTiming?: TaskTiming // Filter by timing
  includeMissed?: boolean // If true, include missed tasks (default: exclude)
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
  due_this_month: number
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
 * Task template for auto-creation (unified model)
 */
export interface TaskTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  department: DepartmentId | string | null
  task_type: UnifiedTaskType | string | null

  // Template defaults
  default_title: string
  default_description: string | null
  default_priority: TaskPriority
  default_due_in_days: number | null
  requires_assignment: boolean

  // Timeline calculation fields
  days_before_event: number | null
  days_after_event: number | null // For post-event tasks
  days_after_booking: number | null
  start_days_before_event: number | null
  start_days_after_booking: number | null
  use_event_date: boolean

  // Approval settings
  requires_approval: boolean
  default_quantity: number | null

  // Display settings
  display_order: number
  icon: string | null
  color: string | null
  category: string | null

  // Status
  enabled: boolean
  is_active: boolean

  // Task timing (added 2025-12-31)
  task_timing: TaskTiming // pre_event, post_event, or general

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string

  // Migration tracking
  migrated_from_table: string | null
  migrated_from_id: string | null
}

/**
 * Task note for progress updates
 * These are append-only (no edit/delete) for audit trail
 * Only supported on parent tasks, not subtasks
 */
export interface TaskNote {
  id: string
  tenant_id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  // Populated via join
  author?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Input for creating a new task note
 */
export interface TaskNoteInsert {
  content: string
}

/**
 * Task note with author information (for display)
 */
export interface TaskNoteWithAuthor extends TaskNote {
  author: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Maximum content length for task notes
 */
export const TASK_NOTE_MAX_LENGTH = 4000

/**
 * @deprecated Use TaskNote instead
 * Task comment for collaboration (legacy interface)
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
  return ['pending', 'in_progress', 'awaiting_approval', 'needs_revision', 'approved', 'completed', 'cancelled'].includes(value)
}

/**
 * Check if a status represents a completed state
 */
export function isCompletedStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'approved'
}

/**
 * Check if task type is a unified task type
 */
export function isUnifiedTaskType(value: string): value is UnifiedTaskType {
  return ['general', 'design', 'operations', 'sales', 'admin', 'accounting', 'customer_success', 'project', 'misc'].includes(value)
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

/**
 * Calculate subtask progress from an array of subtasks
 */
export function calculateSubtaskProgress(subtasks: Task[]): SubtaskProgress {
  const total = subtasks.length
  const completed = subtasks.filter(
    (st) => st.status === 'completed' || st.status === 'approved'
  ).length
  return { total, completed }
}

/**
 * Check if a task is a subtask (has a parent)
 */
export function isSubtask(task: Task): boolean {
  return task.parent_task_id !== null
}

/**
 * Check if a task has subtasks
 */
export function hasSubtasks(task: TaskWithRelations): boolean {
  return (task.subtasks && task.subtasks.length > 0) ||
         (task.subtask_progress && task.subtask_progress.total > 0)
}

/**
 * Format subtask progress for display (e.g., "3/5 done")
 */
export function formatSubtaskProgress(progress: SubtaskProgress): string {
  return `${progress.completed}/${progress.total} done`
}
