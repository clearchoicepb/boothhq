/**
 * Workflow Automation Types
 *
 * Type definitions for the workflow automation system.
 * These types mirror the database schema and provide type safety throughout the application.
 *
 * ARCHITECTURE:
 * - Workflow: The workflow template (trigger + actions)
 * - WorkflowAction: Individual steps in a workflow
 * - WorkflowExecution: Audit log of workflow runs
 *
 * SOLID PRINCIPLES:
 * - Single Responsibility: Each type represents one concept
 * - Open/Closed: Extensible via config JSONB fields
 * - Liskov Substitution: Action types can be swapped
 * - Interface Segregation: Separate types for different contexts (Insert, Update, WithRelations)
 * - Dependency Inversion: Components depend on these interfaces, not implementation
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow trigger types
 * Currently only 'event_created', but extensible for future triggers
 */
export type WorkflowTriggerType = 'event_created'

/**
 * Action types that can be performed by workflows
 * Currently only 'create_task', but extensible for:
 * - send_email
 * - send_notification
 * - update_field
 * - call_webhook
 */
export type WorkflowActionType = 'create_task'

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'partial'

/**
 * Available trigger types with metadata
 */
export const WORKFLOW_TRIGGER_TYPES: Record<WorkflowTriggerType, {
  label: string
  description: string
  icon: string
}> = {
  event_created: {
    label: 'Event Created',
    description: 'Triggers when a new event is created',
    icon: 'calendar-plus',
  },
}

/**
 * Available action types with metadata
 */
export const WORKFLOW_ACTION_TYPES: Record<WorkflowActionType, {
  label: string
  description: string
  icon: string
  requiresFields: string[]
}> = {
  create_task: {
    label: 'Create Task',
    description: 'Create and assign a task from a template',
    icon: 'clipboard-check',
    requiresFields: ['task_template_id', 'assigned_to_user_id'],
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE TYPES (Database Schema)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow - Base database record
 * Represents a workflow template in its database form
 */
export interface Workflow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  trigger_type: WorkflowTriggerType
  event_type_id: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Workflow Action - Base database record
 * Represents an individual action/step within a workflow
 */
export interface WorkflowAction {
  id: string
  workflow_id: string
  action_type: WorkflowActionType
  execution_order: number
  task_template_id: string | null
  assigned_to_user_id: string | null
  config: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Workflow Execution - Base database record
 * Audit log of a workflow run
 */
export interface WorkflowExecution {
  id: string
  tenant_id: string
  workflow_id: string
  trigger_type: string
  trigger_entity_type: string | null
  trigger_entity_id: string | null
  status: WorkflowExecutionStatus
  started_at: string
  completed_at: string | null
  actions_executed: number
  actions_successful: number
  actions_failed: number
  error_message: string | null
  error_details: Record<string, any> | null
  created_task_ids: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENDED TYPES (With Relations)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User metadata (for action assignments)
 */
export interface WorkflowUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  department: string | null
  department_role: string | null
}

/**
 * Task Template metadata
 */
export interface WorkflowTaskTemplate {
  id: string
  name: string
  default_title: string
  department: string
  task_type: string | null
  default_priority: 'low' | 'medium' | 'high' | 'urgent'
}

/**
 * Event Type metadata
 */
export interface WorkflowEventType {
  id: string
  name: string
  slug: string
  event_category_id: string
}

/**
 * Workflow Action with full relations
 * Used in UI when displaying/editing workflows
 */
export interface WorkflowActionWithRelations extends WorkflowAction {
  task_template?: WorkflowTaskTemplate | null
  assigned_to_user?: WorkflowUser | null
}

/**
 * Workflow with full relations
 * Used in UI when displaying/editing workflows
 */
export interface WorkflowWithRelations extends Workflow {
  actions: WorkflowActionWithRelations[]
  event_type?: WorkflowEventType | null
  created_by_user?: WorkflowUser | null
}

/**
 * Workflow Execution with relations
 * Used in audit logs and monitoring
 */
export interface WorkflowExecutionWithRelations extends WorkflowExecution {
  workflow?: Workflow | null
}

// ═══════════════════════════════════════════════════════════════════════════
// INSERT / UPDATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Data required to create a new workflow
 */
export interface WorkflowInsert {
  name: string
  description?: string | null
  trigger_type: WorkflowTriggerType
  event_type_id: string | null
  is_active?: boolean
  created_by?: string | null
}

/**
 * Data that can be updated on a workflow
 */
export interface WorkflowUpdate {
  name?: string
  description?: string | null
  event_type_id?: string | null
  is_active?: boolean
}

/**
 * Data required to create a workflow action
 */
export interface WorkflowActionInsert {
  workflow_id: string
  action_type: WorkflowActionType
  execution_order: number
  task_template_id?: string | null
  assigned_to_user_id?: string | null
  config?: Record<string, any>
}

/**
 * Data that can be updated on a workflow action
 */
export interface WorkflowActionUpdate {
  execution_order?: number
  task_template_id?: string | null
  assigned_to_user_id?: string | null
  config?: Record<string, any>
}

/**
 * Workflow execution start data
 */
export interface WorkflowExecutionInsert {
  tenant_id: string
  workflow_id: string
  trigger_type: string
  trigger_entity_type?: string | null
  trigger_entity_id?: string | null
}

/**
 * Workflow execution update data
 */
export interface WorkflowExecutionUpdate {
  status?: WorkflowExecutionStatus
  completed_at?: string
  actions_executed?: number
  actions_successful?: number
  actions_failed?: number
  error_message?: string | null
  error_details?: Record<string, any> | null
  created_task_ids?: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILDER TYPES (UI-Specific)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow builder state
 * Used in the workflow builder UI component
 */
export interface WorkflowBuilderState {
  // Step 1: Trigger
  triggerType: WorkflowTriggerType
  eventTypeId: string | null

  // Step 2: Actions
  actions: WorkflowBuilderAction[]

  // Step 3: Metadata
  name: string
  description: string | null
  isActive: boolean
}

/**
 * Action in the builder (before saving)
 * Includes temporary ID for drag-and-drop
 */
export interface WorkflowBuilderAction {
  tempId: string // Temporary ID for UI (not saved to DB)
  actionType: WorkflowActionType
  taskTemplateId: string | null
  assignedToUserId: string | null
  config: Record<string, any>
}

/**
 * Workflow save payload
 * What gets sent to API when saving a workflow
 */
export interface WorkflowSavePayload {
  workflow: WorkflowInsert
  actions: Omit<WorkflowActionInsert, 'workflow_id'>[]
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER & QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow list filters
 */
export interface WorkflowFilters {
  eventTypeId?: string
  isActive?: boolean
  search?: string
  createdBy?: string
}

/**
 * Workflow list options
 */
export interface WorkflowListOptions extends WorkflowFilters {
  page?: number
  limit?: number
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Workflow execution filters
 */
export interface WorkflowExecutionFilters {
  workflowId?: string
  triggerEntityType?: string
  triggerEntityId?: string
  status?: WorkflowExecutionStatus
  startedFrom?: string
  startedTo?: string
}

/**
 * Workflow execution list options
 */
export interface WorkflowExecutionListOptions extends WorkflowExecutionFilters {
  page?: number
  limit?: number
  sortBy?: 'started_at' | 'completed_at'
  sortOrder?: 'asc' | 'desc'
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow execution context
 * Passed to workflow engine during execution
 */
export interface WorkflowExecutionContext {
  tenantId: string
  dataSourceTenantId: string
  triggerType: WorkflowTriggerType
  triggerEntity: {
    type: string
    id: string
    data: Record<string, any>
  }
  userId?: string // User who triggered the workflow (if manual)
}

/**
 * Action execution result
 * Returned by individual action executors
 */
export interface ActionExecutionResult {
  success: boolean
  actionId: string
  actionType: WorkflowActionType
  error?: {
    message: string
    details?: any
  }
  createdTaskId?: string // For create_task actions
  output?: any // Flexible output for future action types
}

/**
 * Workflow execution result
 * Returned by workflow engine after execution
 */
export interface WorkflowExecutionResult {
  executionId: string
  workflowId: string
  status: WorkflowExecutionStatus
  actionsExecuted: number
  actionsSuccessful: number
  actionsFailed: number
  createdTaskIds: string[]
  actionResults: ActionExecutionResult[]
  error?: {
    message: string
    details?: any
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  isValid: boolean
  errors: WorkflowValidationError[]
  warnings: WorkflowValidationWarning[]
}

/**
 * Workflow validation error
 */
export interface WorkflowValidationError {
  field: string
  message: string
  code: string
}

/**
 * Workflow validation warning
 */
export interface WorkflowValidationWarning {
  field: string
  message: string
  code: string
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow statistics
 * Used in workflow list and dashboard
 */
export interface WorkflowStats {
  totalWorkflows: number
  activeWorkflows: number
  inactiveWorkflows: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number // milliseconds
  totalTasksCreated: number
}

/**
 * Workflow details with stats
 * Used in workflow detail view
 */
export interface WorkflowWithStats extends WorkflowWithRelations {
  stats: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    lastExecutedAt: string | null
    totalTasksCreated: number
  }
}

