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
 * Phase 3: Extended to support task and time-based triggers
 */
export type WorkflowTriggerType =
  | 'event_created'           // When an event is created (original)
  | 'task_created'            // When a task is created
  | 'task_status_changed'     // When a task status changes
  | 'event_date_approaching'  // X days before event date (cron-based)

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
  triggerTypes?: WorkflowTriggerType[] // Which trigger types this field is available for
}> = {
  // Event-related fields (for event_created and event_date_approaching triggers)
  'event.event_type_id': {
    label: 'Event Type',
    description: 'The type of event (Wedding, Corporate, etc.)',
    type: 'uuid',
    entity: 'event',
    lookupTable: 'event_types',
    triggerTypes: ['event_created', 'event_date_approaching'],
  },
  'event.account_id': {
    label: 'Account',
    description: 'The account/customer for the event',
    type: 'uuid',
    entity: 'event',
    lookupTable: 'accounts',
    triggerTypes: ['event_created', 'event_date_approaching'],
  },
  'event.assigned_to': {
    label: 'Assigned To',
    description: 'Staff member assigned to the event',
    type: 'uuid',
    entity: 'event',
    lookupTable: 'users',
    triggerTypes: ['event_created', 'event_date_approaching'],
  },
  // Task-related fields (for task_created and task_status_changed triggers)
  'task.status': {
    label: 'Task Status',
    description: 'Current status of the task',
    type: 'string',
    entity: 'task',
    triggerTypes: ['task_created', 'task_status_changed'],
  },
  'task.priority': {
    label: 'Task Priority',
    description: 'Priority level of the task',
    type: 'string',
    entity: 'task',
    triggerTypes: ['task_created', 'task_status_changed'],
  },
  'task.department': {
    label: 'Task Department',
    description: 'Department the task belongs to',
    type: 'string',
    entity: 'task',
    triggerTypes: ['task_created', 'task_status_changed'],
  },
  'task.assigned_to': {
    label: 'Task Assigned To',
    description: 'User assigned to the task',
    type: 'uuid',
    entity: 'task',
    lookupTable: 'users',
    triggerTypes: ['task_created', 'task_status_changed'],
  },
  'task.entity_type': {
    label: 'Task Entity Type',
    description: 'Type of entity the task is linked to (event, account, etc.)',
    type: 'string',
    entity: 'task',
    triggerTypes: ['task_created', 'task_status_changed'],
  },
  'task.auto_created': {
    label: 'Auto Created',
    description: 'Whether the task was created by a workflow',
    type: 'boolean',
    entity: 'task',
    triggerTypes: ['task_created', 'task_status_changed'],
  },
}

/**
 * Action types that can be performed by workflows
 *
 * Active action types:
 * - create_task: Create a task from any template (design, operations, general, etc.)
 * - assign_event_role: Assign a user to an event staff role
 * - send_email: Send templated email
 * - send_notification: In-app notification
 * - assign_task: Assign user to existing task
 *
 * DEPRECATED (kept for backwards compatibility with existing workflows):
 * - create_design_item: Use create_task with design templates instead
 * - create_ops_item: Use create_task with operations templates instead
 *
 * Future action types:
 * - update_field: Field updates
 * - call_webhook: External integrations
 */
export type WorkflowActionType =
  | 'create_task'
  | 'create_design_item'  // @deprecated - use create_task with design templates
  | 'create_ops_item'     // @deprecated - use create_task with operations templates
  | 'assign_event_role'
  | 'send_email'
  | 'send_notification'
  | 'assign_task'

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'partial' | 'skipped'

/**
 * Trigger configuration types
 */
export interface TriggerConfigTaskStatusChanged {
  from_status?: string | null  // Status to trigger on (null = any)
  to_status?: string | null    // New status to trigger on (null = any)
}

export interface TriggerConfigEventDateApproaching {
  days_before: number          // Number of days before event
}

export interface TriggerConfigTaskCreated {
  task_types?: string[]        // Optional: Filter by task types
  departments?: string[]       // Optional: Filter by departments
}

export type TriggerConfig =
  | TriggerConfigTaskStatusChanged
  | TriggerConfigEventDateApproaching
  | TriggerConfigTaskCreated
  | Record<string, any>

/**
 * Available trigger types with metadata
 */
export const WORKFLOW_TRIGGER_TYPES: Record<WorkflowTriggerType, {
  label: string
  description: string
  icon: string
  category: 'event' | 'task' | 'time'
  requiresEventTypes: boolean
  configFields?: Array<{
    key: string
    label: string
    type: 'select' | 'number' | 'multiselect'
    options?: Array<{ value: string; label: string }>
    required?: boolean
    default?: any
  }>
}> = {
  event_created: {
    label: 'Event Created',
    description: 'Triggers when a new event is created',
    icon: 'calendar-plus',
    category: 'event',
    requiresEventTypes: true,
  },
  task_created: {
    label: 'Task Created',
    description: 'Triggers when a new task is created',
    icon: 'clipboard-plus',
    category: 'task',
    requiresEventTypes: false,
    configFields: [
      {
        key: 'task_types',
        label: 'Task Types (Optional)',
        type: 'multiselect',
        options: [
          { value: 'general', label: 'General' },
          { value: 'design', label: 'Design' },
          { value: 'production', label: 'Production' },
          { value: 'operations', label: 'Operations' },
        ],
        required: false,
      },
    ],
  },
  task_status_changed: {
    label: 'Task Status Changed',
    description: 'Triggers when a task status changes',
    icon: 'refresh-cw',
    category: 'task',
    requiresEventTypes: false,
    configFields: [
      {
        key: 'from_status',
        label: 'From Status (Optional)',
        type: 'select',
        options: [
          { value: '', label: 'Any Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'on_hold', label: 'On Hold' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        required: false,
      },
      {
        key: 'to_status',
        label: 'To Status (Optional)',
        type: 'select',
        options: [
          { value: '', label: 'Any Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'on_hold', label: 'On Hold' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        required: false,
      },
    ],
  },
  event_date_approaching: {
    label: 'Event Date Approaching',
    description: 'Triggers X days before an event date',
    icon: 'clock',
    category: 'time',
    requiresEventTypes: false,
    configFields: [
      {
        key: 'days_before',
        label: 'Days Before Event',
        type: 'number',
        required: true,
        default: 7,
      },
    ],
  },
}

/**
 * Available action types with metadata
 * Organized by department for UI grouping
 *
 * NOTE: create_design_item and create_ops_item are deprecated.
 * Use create_task with design or operations templates instead.
 */
export const WORKFLOW_ACTION_TYPES: Record<WorkflowActionType, {
  label: string
  description: string
  icon: string
  department: string
  requiresFields: string[]
  category: 'creation' | 'communication' | 'assignment'
  deprecated?: boolean
}> = {
  // Creation actions
  create_task: {
    label: 'Create Task',
    description: 'Create a task from any template (design, operations, general, etc.)',
    icon: 'clipboard-check',
    department: 'General',
    requiresFields: ['task_template_id', 'assigned_to_user_id'],
    category: 'creation',
  },
  // DEPRECATED: Use create_task with design templates instead
  create_design_item: {
    label: 'Create Design Item (Deprecated)',
    description: 'DEPRECATED: Use Create Task with a design template instead',
    icon: 'palette',
    department: 'Design',
    requiresFields: ['design_item_type_id'],
    category: 'creation',
    deprecated: true,
  },
  // DEPRECATED: Use create_task with operations templates instead
  create_ops_item: {
    label: 'Create Operations Item (Deprecated)',
    description: 'DEPRECATED: Use Create Task with an operations template instead',
    icon: 'briefcase',
    department: 'Operations',
    requiresFields: ['operations_item_type_id'],
    category: 'creation',
    deprecated: true,
  },
  // Assignment actions
  assign_event_role: {
    label: 'Assign Event Role',
    description: 'Assign a staff member to an event role',
    icon: 'user-plus',
    department: 'Staff',
    requiresFields: ['staff_role_id', 'assigned_to_user_id'],
    category: 'assignment',
  },
  assign_task: {
    label: 'Assign Task',
    description: 'Assign a user to the triggering task',
    icon: 'user-check',
    department: 'General',
    requiresFields: ['assigned_to_user_id'],
    category: 'assignment',
  },
  // Communication actions
  send_email: {
    label: 'Send Email',
    description: 'Send a templated email notification',
    icon: 'mail',
    department: 'Communication',
    requiresFields: ['config.template_id', 'config.recipient_type'],
    category: 'communication',
  },
  send_notification: {
    label: 'Send Notification',
    description: 'Send an in-app notification',
    icon: 'bell',
    department: 'Communication',
    requiresFields: ['assigned_to_user_id', 'config.message'],
    category: 'communication',
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
  trigger_config: TriggerConfig // Phase 3: Trigger-specific configuration
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
  staff_role_id: string | null // For assign_event_role actions
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
  event_type_ids?: string[] // Changed to array for multi-select, optional for non-event triggers
  trigger_config?: TriggerConfig // Phase 3: Trigger-specific configuration
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
  trigger_type?: WorkflowTriggerType
  event_type_ids?: string[] // Changed to array for multi-select
  trigger_config?: TriggerConfig // Phase 3: Trigger-specific configuration
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
  staff_role_id?: string | null
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
  staff_role_id?: string | null
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
  triggerConfig: TriggerConfig // Phase 3: Trigger-specific configuration

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
  staffRoleId: string | null
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
    type: 'event' | 'task' | string
    id: string
    data: Record<string, any>
  }
  // Phase 3: Additional context for task triggers
  previousData?: Record<string, any> // For status change triggers, contains previous state
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
  createdAssignmentId?: string // For assign_event_role actions
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
  createdAssignmentIds: string[]
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

