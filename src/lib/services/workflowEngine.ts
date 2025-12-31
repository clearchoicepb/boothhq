/**
 * Workflow Execution Engine
 *
 * Server-side service for executing workflow automations.
 * This is the CORE of the workflow system - handles trigger detection and action execution.
 *
 * SOLID PRINCIPLES:
 * - Single Responsibility: Only handles workflow execution (not CRUD)
 * - Open/Closed: Extensible for new action types via actionExecutors
 * - Liskov Substitution: All action executors follow same interface
 * - Interface Segregation: Separate interfaces for different action types
 * - Dependency Inversion: Depends on abstractions (SupabaseClient), not concrete implementations
 *
 * USAGE:
 * ```typescript
 * import { workflowEngine } from '@/lib/services/workflowEngine'
 *
 * // In your event creation API:
 * const result = await workflowEngine.executeWorkflowsForEvent({
 *   eventId: newEvent.id,
 *   eventTypeId: newEvent.event_type_id,
 *   tenantId,
 *   dataSourceTenantId,
 *   supabase
 * })
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  WorkflowActionType,
  WorkflowExecutionResult,
  ActionExecutionResult,
  WorkflowExecutionContext,
  WorkflowWithRelations,
  WorkflowActionWithRelations,
  ConditionsEvaluationResult,
} from '@/types/workflows'
import { evaluateConditions } from '@/lib/services/conditionEvaluator'
import { createLogger } from '@/lib/logger'

const log = createLogger('services')

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow execution options
 */
interface ExecuteWorkflowOptions {
  eventId: string
  eventTypeId: string
  tenantId: string
  dataSourceTenantId: string
  supabase: SupabaseClient<Database>
  userId?: string // User who created the event (for audit)
  force?: boolean // Skip duplicate check and re-execute workflows
}

/**
 * Action executor function signature
 * Each action type has an executor function that follows this interface
 */
type ActionExecutor = (
  action: WorkflowActionWithRelations,
  context: WorkflowExecutionContext,
  supabase: SupabaseClient<Database>,
  dataSourceTenantId: string
) => Promise<ActionExecutionResult>

// ═══════════════════════════════════════════════════════════════════════════
// ACTION EXECUTORS
// ═══════════════════════════════════════════════════════════════════════════
// Each action type has its own executor function
// This makes the system extensible - add new action types by adding new executors

/**
 * Execute a 'create_task' action
 * Creates a task from a template and assigns it to a user
 */
const executeCreateTaskAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'create_task',
  }

  try {
    // Validate required fields
    if (!action.task_template_id || !action.assigned_to_user_id) {
      throw new Error('create_task action requires task_template_id and assigned_to_user_id')
    }

    // Fetch task template
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', action.task_template_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (templateError || !template) {
      throw new Error(`Task template not found: ${action.task_template_id}`)
    }

    // Calculate due date
    let dueDate: string | null = null

    // Priority 1: Event-based calculation (pre-event: days before first date)
    if (template.use_event_date && template.days_before_event !== null) {
      if (context.triggerEntity?.type === 'event') {
        const eventData = context.triggerEntity.data
        let eventDateStr = eventData?.start_date || eventData?.event_date

        // Fetch from event_dates table (first/earliest date)
        if (!eventDateStr && context.triggerEntity.id) {
          const { data: eventDates } = await supabase
            .from('event_dates')
            .select('event_date')
            .eq('event_id', context.triggerEntity.id)
            .eq('tenant_id', dataSourceTenantId)
            .order('event_date', { ascending: true })
            .limit(1)

          if (eventDates?.[0]?.event_date) {
            eventDateStr = eventDates[0].event_date
          }
        }

        if (eventDateStr) {
          const eventDate = new Date(eventDateStr.includes('T') ? eventDateStr : eventDateStr + 'T00:00:00')
          eventDate.setDate(eventDate.getDate() - template.days_before_event)
          dueDate = eventDate.toISOString().split('T')[0]
        }
      }
    }
    // Priority 1b: Event-based calculation (post-event: days after last date)
    else if (template.use_event_date && template.days_after_event !== null) {
      if (context.triggerEntity?.type === 'event' && context.triggerEntity.id) {
        const { data: eventDates } = await supabase
          .from('event_dates')
          .select('event_date')
          .eq('event_id', context.triggerEntity.id)
          .eq('tenant_id', dataSourceTenantId)
          .order('event_date', { ascending: false }) // Get LAST (latest) date
          .limit(1)

        if (eventDates?.[0]?.event_date) {
          const eventDateStr = eventDates[0].event_date
          const eventDate = new Date(eventDateStr.includes('T') ? eventDateStr : eventDateStr + 'T00:00:00')
          eventDate.setDate(eventDate.getDate() + template.days_after_event)
          dueDate = eventDate.toISOString().split('T')[0]
        }
      }
    }

    // Priority 2: Fallback to days-from-creation
    if (!dueDate && template.default_due_in_days) {
      const due = new Date()
      due.setDate(due.getDate() + template.default_due_in_days)
      dueDate = due.toISOString().split('T')[0]
    }

    // Create task from template
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title: template.default_title,
        description: template.default_description,
        priority: template.default_priority,
        due_date: dueDate,
        assigned_to: action.assigned_to_user_id,
        created_by: context.userId || action.assigned_to_user_id, // Fallback to assignee if no user
        status: 'pending',
        entity_type: context.triggerEntity.type,
        entity_id: context.triggerEntity.id,
        department: template.department,
        task_type: template.task_type,
        task_timing: template.task_timing || 'pre_event',
        // Workflow tracking fields
        auto_created: true,
        workflow_id: action.workflow_id,
        // workflow_execution_id will be set after execution record is created
      })
      .select()
      .single()

    if (taskError || !task) {
      throw new Error(`Failed to create task: ${taskError?.message || 'Unknown error'}`)
    }

    result.success = true
    result.createdTaskId = task.id

    return result
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
    return result
  }
}

/**
 * Execute a 'create_design_item' action
 * Creates a UNIFIED design task with all design-specific fields
 * NOTE: Legacy event_design_items table has been deprecated - only unified tasks are created
 */
const executeCreateDesignItemAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'create_design_item',
  }

  try {
    // Debug: Log action data
    log.debug({
      action_id: action.id,
      design_item_type_id: action.design_item_type_id,
      assigned_to_user_id: action.assigned_to_user_id,
      workflow_id: action.workflow_id,
      has_assigned_to_user: !!action.assigned_to_user,
      action_keys: Object.keys(action),
    }, 'create_design_item action')

    // Validate required fields
    if (!action.design_item_type_id) {
      throw new Error('create_design_item action requires design_item_type_id')
    }

    if (!action.assigned_to_user_id) {
      log.warn('[WorkflowEngine] ⚠️  No assigned_to_user_id found in action!')
    }

    // NOTE: design_item_types table has been deprecated.
    // Look up the migrated task template by the original design item type ID
    const { data: taskTemplate, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('migrated_from_id', action.design_item_type_id)
      .eq('migrated_from_table', 'design_item_types')
      .eq('tenant_id', dataSourceTenantId)
      .single()

    // Fallback: try direct ID lookup (in case template was manually created)
    let designItemType = taskTemplate
    if (templateError || !taskTemplate) {
      const { data: directTemplate, error: directError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', action.design_item_type_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (directError || !directTemplate) {
        throw new Error(`Design item type ${action.design_item_type_id} not found in task_templates. ` +
          `The design_item_types table has been deprecated. Please update your workflow to use a task template.`)
      }
      designItemType = directTemplate
    }

    // Map task_template fields to expected design item type fields
    const mappedDesignItemType = {
      ...designItemType,
      name: designItemType.name || designItemType.default_title,
      // Use days_before_event as the total timeline
      default_design_days: designItemType.days_before_event || designItemType.default_due_in_days || 14,
      default_production_days: 0,
      default_shipping_days: 0,
      client_approval_buffer_days: 0,
    }

    // Reassign to use the mapped type
    designItemType = mappedDesignItemType as any

    // Get event data to calculate deadlines
    const event = context.triggerEntity.data
    const eventDate = event.start_date || event.event_date

    log.debug({
      event_id: event.id,
      start_date: event.start_date,
      start_date_type: typeof event.start_date,
      event_date: event.event_date,
      eventDate_selected: eventDate,
    }, 'Design Item Date Debug')

    if (!eventDate) {
      throw new Error('Event date is required for design item timeline calculations')
    }

    // Parse event date - handles both YYYY-MM-DD and full ISO timestamps
    let eventDateObj: Date
    if (typeof eventDate === 'string') {
      eventDateObj = eventDate.includes('T')
        ? new Date(eventDate)
        : new Date(eventDate + 'T00:00:00')
    } else {
      eventDateObj = new Date(eventDate)
    }

    log.debug({
      input: eventDate,
      parsed: eventDateObj.toISOString(),
      isValid: !isNaN(eventDateObj.getTime()),
    }, 'Parsed event date')

    // Calculate deadlines working backwards from event date
    const totalDays =
      (designItemType.default_design_days || 0) +
      (designItemType.default_production_days || 0) +
      (designItemType.default_shipping_days || 0) +
      (designItemType.client_approval_buffer_days || 0)

    const designDeadline = new Date(eventDateObj)
    designDeadline.setDate(designDeadline.getDate() - totalDays)

    const designStartDate = new Date(designDeadline)
    designStartDate.setDate(designStartDate.getDate() - (designItemType.default_design_days || 0))

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const now = new Date()
    const daysUntilDeadline = Math.ceil((designDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // ═══════════════════════════════════════════════════════════════════════
    // UNIFIED TASK MODEL: Create the design task with ALL design fields
    // This is the PRIMARY record - the unified task
    // ═══════════════════════════════════════════════════════════════════════
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        entity_type: 'event',
        entity_id: context.triggerEntity.id,
        title: designItemType.name,
        description: `Auto-created from workflow: ${context.workflowName || 'Unnamed workflow'}`,
        due_date: formatDate(designDeadline),
        priority: daysUntilDeadline <= 7 ? 'high' : 'medium',
        status: 'pending',
        department: 'design',
        task_type: 'design',  // UNIFIED: This is a design task
        assigned_to: action.assigned_to_user_id,
        assigned_at: action.assigned_to_user_id ? new Date().toISOString() : null,
        auto_created: true,
        workflow_id: action.workflow_id,
        // Design-specific fields (UNIFIED model)
        quantity: 1,
        requires_approval: designItemType.requires_approval ?? true,
        design_deadline: formatDate(designDeadline),
        design_start_date: formatDate(designStartDate),
        product_id: designItemType.default_product_id,
        internal_notes: `Design type: ${designItemType.name}`,
      })
      .select()
      .single()

    if (taskError || !task) {
      throw new Error(`Failed to create design task: ${taskError?.message || 'Unknown error'}`)
    }

    log.info({ taskName: designItemType.name, taskId: task.id, deadline: formatDate(designDeadline) }, 'Created UNIFIED design task')

    // Legacy event_design_items table has been deprecated
    // All design tasks are now created in the unified tasks table only

    result.success = true
    result.createdTaskId = task.id

    return result
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
    return result
  }
}

/**
 * Execute a 'create_ops_item' action
 * Creates a UNIFIED operations task with operations-specific fields
 * NOTE: Legacy event_operations_items table has been deprecated - only unified tasks are created
 */
const executeCreateOpsItemAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'create_ops_item',
  }

  try {
    // Debug: Log action data
    log.debug({
      action_id: action.id,
      operations_item_type_id: action.operations_item_type_id,
      assigned_to_user_id: action.assigned_to_user_id,
      workflow_id: action.workflow_id,
    }, 'create_ops_item action')

    // Validate required fields
    if (!action.operations_item_type_id) {
      throw new Error('create_ops_item action requires operations_item_type_id')
    }

    // NOTE: operations_item_types table has been deprecated.
    // Look up the migrated task template by the original operations item type ID
    const { data: taskTemplate, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('migrated_from_id', action.operations_item_type_id)
      .eq('migrated_from_table', 'operations_item_types')
      .eq('tenant_id', dataSourceTenantId)
      .single()

    // Fallback: try direct ID lookup (in case template was manually created)
    let opsItemType = taskTemplate
    if (templateError || !taskTemplate) {
      const { data: directTemplate, error: directError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', action.operations_item_type_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (directError || !directTemplate) {
        throw new Error(`Operations item type ${action.operations_item_type_id} not found in task_templates. ` +
          `The operations_item_types table has been deprecated. Please update your workflow to use a task template.`)
      }
      opsItemType = directTemplate
    }

    // Map task_template fields to expected operations item type fields
    const mappedOpsItemType = {
      ...opsItemType,
      name: opsItemType.name || opsItemType.default_title,
      due_date_days: opsItemType.days_before_event || opsItemType.default_due_in_days || 7,
    }

    // Reassign to use the mapped type
    opsItemType = mappedOpsItemType as any

    // Get event data to calculate deadlines
    const event = context.triggerEntity.data
    const eventDate = event.start_date || event.event_date

    log.debug({
      event_id: event.id,
      start_date: event.start_date,
      event_date: event.event_date,
      eventDate_selected: eventDate,
      due_date_days: opsItemType.due_date_days,
    }, 'Ops Item Date Debug')

    if (!eventDate) {
      throw new Error('Event date is required for operations item timeline calculations')
    }

    // Parse event date
    let eventDateObj: Date
    if (typeof eventDate === 'string') {
      eventDateObj = eventDate.includes('T')
        ? new Date(eventDate)
        : new Date(eventDate + 'T00:00:00')
    } else {
      eventDateObj = new Date(eventDate)
    }

    // Calculate due date (days before event)
    const dueDate = new Date(eventDateObj)
    dueDate.setDate(dueDate.getDate() - (opsItemType.due_date_days || 0))

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const now = new Date()
    const daysUntilDeadline = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // ═══════════════════════════════════════════════════════════════════════
    // UNIFIED TASK MODEL: Create the operations task with all ops fields
    // This is the PRIMARY record - the unified task
    // ═══════════════════════════════════════════════════════════════════════
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        entity_type: 'event',
        entity_id: context.triggerEntity.id,
        title: opsItemType.name,
        description: `Auto-created from workflow: ${context.workflowName || 'Unnamed workflow'}`,
        due_date: formatDate(dueDate),
        priority: daysUntilDeadline <= 3 ? 'urgent' : daysUntilDeadline <= 7 ? 'high' : 'medium',
        status: 'pending',
        department: 'operations',
        task_type: 'operations',  // UNIFIED: This is an operations task
        assigned_to: action.assigned_to_user_id,
        assigned_at: action.assigned_to_user_id ? new Date().toISOString() : null,
        auto_created: true,
        workflow_id: action.workflow_id,
        // Operations tasks don't require approval by default
        requires_approval: false,
        internal_notes: `Operations type: ${opsItemType.name}`,
      })
      .select()
      .single()

    if (taskError || !task) {
      throw new Error(`Failed to create operations task: ${taskError?.message || 'Unknown error'}`)
    }

    log.info({ taskName: opsItemType.name, taskId: task.id, deadline: formatDate(dueDate) }, 'Created UNIFIED operations task')

    // Legacy event_operations_items table has been deprecated
    // All operations tasks are now created in the unified tasks table only

    result.success = true
    result.createdTaskId = task.id

    return result
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
    return result
  }
}

/**
 * Execute an 'assign_event_role' action
 * Assigns a user to a staff role for an event
 * Creates an entry in event_staff_assignments table
 */
const executeAssignEventRoleAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'assign_event_role',
  }

  try {
    // Debug: Log action data
    log.debug({
      action_id: action.id,
      staff_role_id: action.staff_role_id,
      assigned_to_user_id: action.assigned_to_user_id,
      workflow_id: action.workflow_id,
    }, 'assign_event_role action')

    // Validate required fields
    if (!action.staff_role_id) {
      throw new Error('assign_event_role action requires staff_role_id')
    }

    if (!action.assigned_to_user_id) {
      throw new Error('assign_event_role action requires assigned_to_user_id')
    }

    const eventId = context.triggerEntity.id

    // Check if assignment already exists (to avoid duplicates)
    const { data: existingAssignment } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .eq('staff_role_id', action.staff_role_id)
      .eq('user_id', action.assigned_to_user_id)
      .is('event_date_id', null) // Operations roles have null event_date_id
      .single()

    if (existingAssignment) {
      log.debug(`Assignment already exists for event ${eventId}, role ${action.staff_role_id}, user ${action.assigned_to_user_id}`)
      // Return success but note it was already assigned
      result.success = true
      result.createdAssignmentId = existingAssignment.id
      result.output = { alreadyExisted: true }
      return result
    }

    // Create the staff assignment
    // Operations roles use event_date_id = NULL (assigned to event, not specific date)
    const insertData = {
      tenant_id: dataSourceTenantId,
      event_id: eventId,
      user_id: action.assigned_to_user_id,
      staff_role_id: action.staff_role_id,
      event_date_id: null, // Operations roles assigned at event level
      // Note: role field is deprecated, using staff_role_id instead
    }

    log.debug({ insertData }, 'Creating event staff assignment')

    const { data: assignment, error: assignmentError } = await supabase
      .from('event_staff_assignments')
      .insert(insertData)
      .select()
      .single()

    if (assignmentError || !assignment) {
      throw new Error(`Failed to create staff assignment: ${assignmentError?.message || 'Unknown error'}`)
    }

    log.debug(`Created event staff assignment (${assignment.id}) for role ${action.staff_role_id}`)

    result.success = true
    result.createdAssignmentId = assignment.id

    return result
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
    return result
  }
}

/**
 * Action executor registry
 * Maps action types to their executor functions
 * Add new action types here for extensibility
 */
// Placeholder executor for unimplemented action types
const executeNotImplementedAction: ActionExecutor = async (action, context, supabase, dataSourceTenantId) => {
  return {
    success: false,
    actionId: action.id,
    actionType: action.action_type as WorkflowActionType,
    error: {
      message: `Action type "${action.action_type}" is not yet implemented`,
    },
  }
}

const ACTION_EXECUTORS: Record<WorkflowActionType, ActionExecutor> = {
  create_task: executeCreateTaskAction,
  create_design_item: executeCreateDesignItemAction,
  create_ops_item: executeCreateOpsItemAction,
  assign_event_role: executeAssignEventRoleAction,
  // Placeholder for future action types
  send_email: executeNotImplementedAction,
  send_notification: executeNotImplementedAction,
  assign_task: executeNotImplementedAction,
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class WorkflowEngine {
  /**
   * Execute all active workflows for a specific event
   * This is the main entry point called after event creation
   *
   * @param options - Event and tenant context
   * @returns Array of execution results (one per workflow)
   */
  async executeWorkflowsForEvent(
    options: ExecuteWorkflowOptions
  ): Promise<WorkflowExecutionResult[]> {
    const { eventId, eventTypeId, tenantId, dataSourceTenantId, supabase, userId, force } = options

    log.debug({ force }, 'Workflow Engine - executeWorkflowsForEvent called')

    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // DUPLICATE PREVENTION (unless force = true)
      // ═══════════════════════════════════════════════════════════════════════════
      let alreadyExecutedWorkflowIds = new Set<string>()

      if (!force) {
        // Check if workflows have already been executed for this event
        const { data: existingExecutions, error: executionsError } = await supabase
          .from('workflow_executions')
          .select('workflow_id, status')
          .eq('trigger_entity_id', eventId)
          .eq('tenant_id', dataSourceTenantId)

        if (executionsError) {
          log.error({ executionsError }, '[workflowEngine] Error checking existing executions')
        }

        // Build a Set of workflow IDs that have already been successfully executed
        alreadyExecutedWorkflowIds = new Set(
          existingExecutions
            ?.filter(e => e.status === 'completed' || e.status === 'partial')
            ?.map(e => e.workflow_id) || []
        )

        log.debug(`Found ${alreadyExecutedWorkflowIds.size} already-executed workflows for event ${eventId}`)
      } else {
        log.debug('🔥 FORCE MODE: Skipping duplicate check, will re-execute all workflows')
      }

      // Find all active workflows that include this event type
      // Uses PostgreSQL array containment operator (@>) to check if event_type_ids contains eventTypeId
      // NOTE: design_item_types and operations_item_types tables have been deprecated.
      // The join to design_item_type has been removed - templates are looked up at action execution time.
      const { data: workflows, error: workflowsError } = await supabase
        .from('workflows')
        .select(`
          *,
          actions:workflow_actions(
            *,
            task_template:task_templates(*),
            assigned_to_user:users(id, first_name, last_name, email, department, department_role)
          )
        `)
        .eq('tenant_id', dataSourceTenantId)
        .contains('event_type_ids', [eventTypeId]) // Check if array contains this event type
        .eq('is_active', true)
        .eq('trigger_type', 'event_created')
        .order('created_at', { ascending: true })

      if (workflowsError) {
        log.error({ workflowsError }, '[WorkflowEngine] Error fetching workflows')
        return []
      }

      if (!workflows || workflows.length === 0) {
        log.debug({ eventTypeId }, 'No active workflows found for event type')
        return []
      }

      log.debug(`Found ${workflows.length} active workflow(s) for event type`)

      // Fetch event data for context
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!event) {
        log.error({ eventId }, '[WorkflowEngine] Event not found')
        return []
      }

      log.debug({
        id: event.id,
        start_date: event.start_date,
        start_date_type: typeof event.start_date,
        event_date: event.event_date,
        all_keys: Object.keys(event)
      }, 'Event data fetched')

      // Filter out workflows that have already been executed (duplicate prevention)
      const workflowsToExecute = workflows.filter((workflow) => {
        if (alreadyExecutedWorkflowIds.has(workflow.id)) {
          log.debug(`⏭️  Skipping workflow ${workflow.id} (${workflow.name}) - already executed for event ${eventId}`)
          return false
        }
        return true
      })

      log.debug(`Executing ${workflowsToExecute.length} of ${workflows.length} workflows`)

      // Execute each workflow
      const results = await Promise.all(
        workflowsToExecute.map((workflow) =>
          this.executeWorkflow(workflow as WorkflowWithRelations, {
            tenantId,
            dataSourceTenantId,
            supabase,
            event,
            userId,
          })
        )
      )

      return results
    } catch (error) {
      log.error({ error }, '[WorkflowEngine] Error executing workflows')
      return []
    }
  }

  /**
   * Execute a single workflow
   * Creates execution record, runs all actions, updates execution record
   *
   * @param workflow - Workflow to execute (with actions)
   * @param context - Execution context
   * @returns Execution result
   */
  private async executeWorkflow(
    workflow: WorkflowWithRelations,
    context: {
      tenantId: string
      dataSourceTenantId: string
      supabase: SupabaseClient<Database>
      event: any
      userId?: string
    }
  ): Promise<WorkflowExecutionResult> {
    const { tenantId, dataSourceTenantId, supabase, event, userId } = context

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        tenant_id: dataSourceTenantId,
        workflow_id: workflow.id,
        trigger_type: 'event_created',
        trigger_entity_type: 'event',
        trigger_entity_id: event.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (executionError || !execution) {
      log.error({ executionError }, '[WorkflowEngine] Failed to create execution record')
      return {
        executionId: 'unknown',
        workflowId: workflow.id,
        status: 'failed',
        actionsExecuted: 0,
        actionsSuccessful: 0,
        actionsFailed: 0,
        createdTaskIds: [],
        createdDesignItemIds: [],
        createdOpsItemIds: [],
        createdAssignmentIds: [],
        actionResults: [],
        error: {
          message: 'Failed to create execution record',
          details: executionError,
        },
      }
    }

    log.debug(`Executing workflow: ${workflow.name} (${workflow.id})`)

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: CONDITION EVALUATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Evaluate conditions before executing any actions
    // If conditions fail, mark execution as 'skipped' and return early

    const conditions = workflow.conditions || []
    let conditionResult: ConditionsEvaluationResult | null = null

    if (conditions.length > 0) {
      // Build context for condition evaluation
      const evaluationContext = {
        event: event,
        // Future: add more context objects (user, account, etc.)
      }

      conditionResult = evaluateConditions(conditions, evaluationContext)

      log.debug({
        workflowName: workflow.name,
        conditionsCount: conditions.length,
        passed: conditionResult.passed,
        results: conditionResult.results.map((r) => ({
          field: r.condition.field,
          operator: r.condition.operator,
          passed: r.passed,
        })),
      }, 'Condition evaluation for workflow')

      // If conditions failed, skip this workflow
      if (!conditionResult.passed) {
        log.debug(`⏭️  Skipping workflow ${workflow.name} - conditions not met`)

        // Update execution record to 'skipped'
        await supabase
          .from('workflow_executions')
          .update({
            status: 'skipped',
            completed_at: new Date().toISOString(),
            conditions_evaluated: true,
            conditions_passed: false,
            condition_results: conditionResult as any, // Cast for JSONB
            actions_executed: 0,
            actions_successful: 0,
            actions_failed: 0,
          })
          .eq('id', execution.id)

        return {
          executionId: execution.id,
          workflowId: workflow.id,
          status: 'skipped',
          actionsExecuted: 0,
          actionsSuccessful: 0,
          actionsFailed: 0,
          createdTaskIds: [],
          createdDesignItemIds: [],
          createdOpsItemIds: [],
          createdAssignmentIds: [],
          actionResults: [],
          conditionResult,
        }
      }
    }

    // Prepare execution context
    const executionContext: WorkflowExecutionContext = {
      tenantId,
      dataSourceTenantId,
      triggerType: 'event_created',
      triggerEntity: {
        type: 'event',
        id: event.id,
        data: event,
      },
      userId,
      workflowName: workflow.name,
    }

    // Sort actions by execution_order
    const sortedActions = [...(workflow.actions || [])]
      .sort((a, b) => a.execution_order - b.execution_order)

    // Execute all actions in order
    const actionResults: ActionExecutionResult[] = []
    const createdTaskIds: string[] = []
    const createdDesignItemIds: string[] = []
    const createdOpsItemIds: string[] = []
    const createdAssignmentIds: string[] = []
    let actionsExecuted = 0
    let actionsSuccessful = 0
    let actionsFailed = 0

    for (const action of sortedActions) {
      log.debug(`Executing action ${action.execution_order + 1}/${sortedActions.length}: ${action.action_type}`)

      try {
        // Get executor for this action type
        const executor = ACTION_EXECUTORS[action.action_type]
        if (!executor) {
          throw new Error(`No executor found for action type: ${action.action_type}`)
        }

        // Execute action
        const result = await executor(action, executionContext, supabase, dataSourceTenantId)

        actionResults.push(result)
        actionsExecuted++

        if (result.success) {
          actionsSuccessful++
          if (result.createdTaskId) {
            createdTaskIds.push(result.createdTaskId)

            // Update task with execution_id
            await supabase
              .from('tasks')
              .update({ workflow_execution_id: execution.id })
              .eq('id', result.createdTaskId)
          }
          // Legacy design item and operations item tables have been deprecated
          // All tasks are now created in the unified tasks table only
          if (result.createdAssignmentId) {
            createdAssignmentIds.push(result.createdAssignmentId)
            log.debug(`Created staff assignment: ${result.createdAssignmentId}`)
          }
        } else {
          actionsFailed++
          log.error({ error: result.error }, 'Action failed')
        }
      } catch (error) {
        log.error({ error }, '[WorkflowEngine] Action execution error')
        actionsFailed++
        actionResults.push({
          success: false,
          actionId: action.id,
          actionType: action.action_type,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          },
        })
      }
    }

    // Determine final status
    let finalStatus: 'completed' | 'failed' | 'partial' = 'completed'
    if (actionsSuccessful === 0) {
      finalStatus = 'failed'
    } else if (actionsFailed > 0) {
      finalStatus = 'partial'
    }

    // Update execution record (including condition tracking)
    await supabase
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        actions_executed: actionsExecuted,
        actions_successful: actionsSuccessful,
        actions_failed: actionsFailed,
        created_task_ids: createdTaskIds,
        // Condition tracking (Phase 1)
        conditions_evaluated: conditions.length > 0,
        conditions_passed: conditions.length > 0 ? true : null, // Only set if we had conditions
        condition_results: conditionResult as any, // Cast for JSONB (null if no conditions)
      })
      .eq('id', execution.id)

    log.debug(`Workflow execution completed: ${finalStatus} (${actionsSuccessful}/${actionsExecuted} successful)`)

    return {
      executionId: execution.id,
      workflowId: workflow.id,
      status: finalStatus,
      actionsExecuted,
      actionsSuccessful,
      actionsFailed,
      createdTaskIds,
      createdDesignItemIds,
      createdOpsItemIds,
      createdAssignmentIds,
      actionResults,
      conditionResult,
    }
  }

  /**
   * Validate a workflow before saving
   * Checks that all required fields are present and valid
   *
   * @param workflow - Workflow data to validate
   * @param actions - Actions to validate
   * @param supabase - Supabase client
   * @param dataSourceTenantId - Tenant ID for queries
   * @returns Validation result with errors/warnings
   */
  async validateWorkflow(
    workflow: { event_type_ids: string[]; conditions?: any[] },
    actions: Array<{
      action_type: WorkflowActionType
      task_template_id?: string | null
      design_item_type_id?: string | null
      operations_item_type_id?: string | null
      staff_role_id?: string | null
      assigned_to_user_id?: string | null
    }>,
    supabase: SupabaseClient<Database>,
    dataSourceTenantId: string
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = []
    const warnings: string[] = []

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATE CONDITIONS (Phase 1)
    // ═══════════════════════════════════════════════════════════════════════════
    if (workflow.conditions && workflow.conditions.length > 0) {
      const { validateConditions } = await import('@/lib/services/conditionEvaluator')
      const conditionValidation = validateConditions(workflow.conditions)

      if (!conditionValidation.valid) {
        for (const error of conditionValidation.errors) {
          if (error.index === -1) {
            errors.push(`Conditions: ${error.errors.join(', ')}`)
          } else {
            errors.push(`Condition ${error.index + 1}: ${error.errors.join(', ')}`)
          }
        }
      }
    }

    // Validate trigger
    if (!workflow.event_type_ids || workflow.event_type_ids.length === 0) {
      errors.push('At least one event type is required')
    } else {
      // Check if all event types exist
      for (const eventTypeId of workflow.event_type_ids) {
        const { data: eventType } = await supabase
          .from('event_types')
          .select('id')
          .eq('id', eventTypeId)
          .eq('tenant_id', dataSourceTenantId)
          .single()

        if (!eventType) {
          errors.push(`Event type ${eventTypeId} does not exist`)
        }
      }
    }

    // Validate actions
    if (actions.length === 0) {
      errors.push('At least one action is required')
    }

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const actionNum = i + 1

      if (action.action_type === 'create_task') {
        // Validate task template
        if (!action.task_template_id) {
          errors.push(`Action ${actionNum}: Task template is required`)
        } else {
          const { data: template } = await supabase
            .from('task_templates')
            .select('id, enabled')
            .eq('id', action.task_template_id)
            .eq('tenant_id', dataSourceTenantId)
            .single()

          if (!template) {
            errors.push(`Action ${actionNum}: Task template does not exist`)
          } else if (!template.enabled) {
            warnings.push(`Action ${actionNum}: Task template is disabled`)
          }
        }

        // Validate assigned user
        if (!action.assigned_to_user_id) {
          errors.push(`Action ${actionNum}: Assigned user is required`)
        } else {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', action.assigned_to_user_id)
            .eq('tenant_id', dataSourceTenantId)
            .single()

          if (!user) {
            errors.push(`Action ${actionNum}: Assigned user does not exist`)
          }
        }
      } else if (action.action_type === 'create_design_item') {
        // NOTE: design_item_types table has been deprecated.
        // Validate by looking up migrated template in task_templates
        if (!action.design_item_type_id) {
          errors.push(`Action ${actionNum}: Design item type is required`)
        } else {
          // Try to find by migrated_from_id first, then by direct ID
          const { data: designTemplate } = await supabase
            .from('task_templates')
            .select('id, is_active, migrated_from_id')
            .or(`migrated_from_id.eq.${action.design_item_type_id},id.eq.${action.design_item_type_id}`)
            .eq('tenant_id', dataSourceTenantId)
            .maybeSingle()

          if (!designTemplate) {
            warnings.push(`Action ${actionNum}: Design item type not found in task_templates (may need migration)`)
          } else if (!designTemplate.is_active) {
            warnings.push(`Action ${actionNum}: Design item template is inactive`)
          }
        }

        // Assigned user is optional for design items (can be assigned later)
        if (action.assigned_to_user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', action.assigned_to_user_id)
            .eq('tenant_id', dataSourceTenantId)
            .single()

          if (!user) {
            errors.push(`Action ${actionNum}: Assigned user does not exist`)
          }
        }
      } else if (action.action_type === 'create_ops_item') {
        // NOTE: operations_item_types table has been deprecated.
        // Validate by looking up migrated template in task_templates
        if (!action.operations_item_type_id) {
          errors.push(`Action ${actionNum}: Operations item type is required`)
        } else {
          // Try to find by migrated_from_id first, then by direct ID
          const { data: opsTemplate } = await supabase
            .from('task_templates')
            .select('id, is_active, migrated_from_id')
            .or(`migrated_from_id.eq.${action.operations_item_type_id},id.eq.${action.operations_item_type_id}`)
            .eq('tenant_id', dataSourceTenantId)
            .maybeSingle()

          if (!opsTemplate) {
            warnings.push(`Action ${actionNum}: Operations item type not found in task_templates (may need migration)`)
          } else if (!opsTemplate.is_active) {
            warnings.push(`Action ${actionNum}: Operations item template is inactive`)
          }
        }

        // Assigned user is optional for operations items (can be assigned later)
        if (action.assigned_to_user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', action.assigned_to_user_id)
            .eq('tenant_id', dataSourceTenantId)
            .single()

          if (!user) {
            errors.push(`Action ${actionNum}: Assigned user does not exist`)
          }
        }
      } else if (action.action_type === 'assign_event_role') {
        // Validate staff role
        // Note: staff_role_id is cross-database (app DB), so we can only validate format
        if (!action.staff_role_id) {
          errors.push(`Action ${actionNum}: Staff role is required`)
        }

        // Validate assigned user (must be specified for role assignment)
        if (!action.assigned_to_user_id) {
          errors.push(`Action ${actionNum}: User to assign is required`)
        } else {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', action.assigned_to_user_id)
            .eq('tenant_id', dataSourceTenantId)
            .single()

          if (!user) {
            errors.push(`Action ${actionNum}: Assigned user does not exist`)
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine()

// Export class for testing
export { WorkflowEngine }

