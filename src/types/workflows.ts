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
 * Condition operators for workflow conditions
 * Used to compare field values against expected values
 */
export type ConditionOperator =
  | 'equals'        // field === value
  | 'not_equals'    // field !== value
  | 'in'            // value.includes(field)
  | 'not_in'        // !value.includes(field)
  | 'contains'      // String(field).includes(value)
  | 'not_contains'  // !String(field).includes(value)
  | 'is_set'        // field != null && field !== ''
  | 'is_not_set'    // field == null || field === ''
  | 'greater_than'  // field > value (for numbers/dates)
  | 'less_than'     // field < value (for numbers/dates)

/**
 * Available condition operators with metadata for UI
 */
export const CONDITION_OPERATORS: Record<ConditionOperator, {
  label: string
  description: string
  requiresValue: boolean
  valueType: 'single' | 'array' | 'none'
}> = {
  equals: {
    label: 'Equals',
    description: 'Field value exactly matches',
    requiresValue: true,
    valueType: 'single',
  },
  not_equals: {
    label: 'Does Not Equal',
    description: 'Field value does not match',
    requiresValue: true,
    valueType: 'single',
  },
  in: {
    label: 'Is One Of',
    description: 'Field value is in the list',
    requiresValue: true,
    valueType: 'array',
  },
  not_in: {
    label: 'Is Not One Of',
    description: 'Field value is not in the list',
    requiresValue: true,
    valueType: 'array',
  },
  contains: {
    label: 'Contains',
    description: 'Field value contains the text',
    requiresValue: true,
    valueType: 'single',
  },
  not_contains: {
    label: 'Does Not Contain',
    description: 'Field value does not contain the text',
    requiresValue: true,
    valueType: 'single',
  },
  is_set: {
    label: 'Is Set',
    description: 'Field has a value (not null/empty)',
    requiresValue: false,
    valueType: 'none',
  },
  is_not_set: {
    label: 'Is Not Set',
    description: 'Field is null or empty',
    requiresValue: false,
    valueType: 'none',
  },
  greater_than: {
    label: 'Greater Than',
    description: 'Field value is greater than',
    requiresValue: true,
    valueType: 'single',
  },
  less_than: {
    label: 'Less Than',
    description: 'Field value is less than',
    requiresValue: true,
    valueType: 'single',
  },
}

/**
 * Available fields that can be used in conditions
 * Organized by entity type for UI grouping
 */
export const CONDITION_FIELDS: Record<string, {
  label: string
  description: string
  type: 'string' | 'uuid' | 'number' | 'date' | 'boolean'
  entity: 'event' | 'task' | 'product'
  lookupTable?: string // For UUID fields, which table to look up display values
}> = {
  'event.event_type_id': {
    label: 'Event Type',
    description: 'The type of event (Wedding, Corporate, etc.)',
    type: 'uuid',
    entity: 'event',
    lookupTable: 'event_types',
  },
  'event.status': {
    label: 'Event Status',
    description: 'Current status of the event',
    type: 'string',
    entity: 'event',
  },
  'event.account_id': {
    label: 'Account',
    description: 'The account/customer for the event',
    type: 'uuid',
    entity: 'event',
    lookupTable: 'accounts',
  },
  'event.assigned_to': {
    label: 'Assigned To',
    description: 'Staff member assigned to the event',
    type: 'uuid',
    entity: 'event',
    lookupTable: 'users',
  },
}

/**
 * Action types that can be performed by workflows
 * Department-based actions:
 * - create_task: General tasks (simple to-dos)
 * - create_design_item: Design department (timeline-based items)
 * - create_ops_item: Operations department (timeline-based items)
 *
 * Future action types:
 * - create_sales_task: Sales department
 * - create_accounting_task: Accounting department
 * - send_email: Email automation
 * - send_notification: In-app notifications
 * - update_field: Field updates
 * - call_webhook: External integrations
 */
export type WorkflowActionType = 'create_task' | 'create_design_item' | 'create_ops_item'

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
 * Organized by department for UI grouping
 */
export const WORKFLOW_ACTION_TYPES: Record<WorkflowActionType, {
  label: string
  description: string
  icon: string
  department: string
  requiresFields: string[]
}> = {
  create_task: {
    label: 'Create Task',
    description: 'Create and assign a simple task',
    icon: 'clipboard-check',
    department: 'General',
    requiresFields: ['task_template_id', 'assigned_to_user_id'],
  },
  create_design_item: {
    label: 'Create Design Item',
    description: 'Create a design item with timeline calculations',
    icon: 'palette',
    department: 'Design',
    requiresFields: ['design_item_type_id'],
  },
  create_ops_item: {
    label: 'Create Operations Item',
    description: 'Create an operations item with timeline calculations',
    icon: 'briefcase',
    department: 'Operations',
    requiresFields: ['operations_item_type_id'],
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// CONDITION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow Condition
 * Represents a single condition that must be met for workflow to execute
 * All conditions in a workflow use AND logic (all must pass)
 */
export interface WorkflowCondition {
  /** Field path to evaluate (e.g., 'event.event_type_id', 'event.status') */
  field: string
  /** Comparison operator */
  operator: ConditionOperator
  /** Value to compare against (type depends on operator) */
  value?: string | string[] | number | boolean | null
}

/**
 * Result of evaluating a single condition
 */
export interface ConditionEvaluationResult {
  condition: WorkflowCondition
  passed: boolean
  actualValue: any
  expectedValue: any
  error?: string
}

/**
 * Result of evaluating all conditions for a workflow
 */
export interface ConditionsEvaluationResult {
  passed: boolean
  results: ConditionEvaluationResult[]
  evaluatedAt: string
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
  event_type_ids: string[] // Changed from single event_type_id to array for multi-select
  conditions: WorkflowCondition[] // Optional conditions that must all pass
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
  design_item_type_id: string | null
  operations_item_type_id: string | null
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
  // Condition tracking (Phase 1)
  conditions_evaluated: boolean | null
  conditions_passed: boolean | null
  condition_results: ConditionsEvaluationResult | null
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
 * Design Item Type metadata
 */
export interface WorkflowDesignItemType {
  id: string
  name: string
  type: 'digital' | 'physical'
  category: 'print' | 'digital' | 'environmental' | 'promotional' | 'other'
  default_design_days: number
  default_production_days: number
  default_shipping_days: number
  client_approval_buffer_days: number
  requires_approval: boolean
}

/**
 * Workflow Action with full relations
 * Used in UI when displaying/editing workflows
 */
export interface WorkflowActionWithRelations extends WorkflowAction {
  task_template?: WorkflowTaskTemplate | null
  design_item_type?: WorkflowDesignItemType | null
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
  event_type_ids: string[] // Changed to array for multi-select
  conditions?: WorkflowCondition[] // Optional conditions (defaults to empty array)
  is_active?: boolean
  created_by?: string | null
}

/**
 * Data that can be updated on a workflow
 */
export interface WorkflowUpdate {
  name?: string
  description?: string | null
  event_type_ids?: string[] // Changed to array for multi-select
  conditions?: WorkflowCondition[] // Optional conditions
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
  design_item_type_id?: string | null
  operations_item_type_id?: string | null
  assigned_to_user_id?: string | null
  config?: Record<string, any>
}

/**
 * Data that can be updated on a workflow action
 */
export interface WorkflowActionUpdate {
  execution_order?: number
  task_template_id?: string | null
  design_item_type_id?: string | null
  operations_item_type_id?: string | null
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
  // Condition tracking (Phase 1)
  conditions_evaluated?: boolean | null
  conditions_passed?: boolean | null
  condition_results?: ConditionsEvaluationResult | null
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
  eventTypeIds: string[] // Changed to array for multi-select

  // Step 1.5: Conditions (optional)
  conditions: WorkflowCondition[]

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
  designItemTypeId: string | null
  operationsItemTypeId: string | null
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
  eventTypeId?: string // Note: Still singular for filtering by a specific event type
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
  workflowName?: string // Name of workflow for logging
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
  createdDesignItemId?: string // For create_design_item actions
  createdOpsItemId?: string // For create_ops_item actions
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
  createdDesignItemIds: string[]
  createdOpsItemIds: string[]
  actionResults: ActionExecutionResult[]
  error?: {
    message: string
    details?: any
  }
  // Condition tracking (Phase 1)
  conditionResult?: ConditionsEvaluationResult | null
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

