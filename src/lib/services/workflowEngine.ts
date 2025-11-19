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
} from '@/types/workflows'

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

    // Calculate due date (if template specifies default_due_in_days)
    let dueDate: string | null = null
    if (template.default_due_in_days) {
      const due = new Date()
      due.setDate(due.getDate() + template.default_due_in_days)
      dueDate = due.toISOString()
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
 * Creates a design item with automatic timeline calculations
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
    // Validate required fields
    if (!action.design_item_type_id) {
      throw new Error('create_design_item action requires design_item_type_id')
    }

    // Fetch design item type
    const { data: designItemType, error: designItemTypeError } = await supabase
      .from('design_item_types')
      .select('*')
      .eq('id', action.design_item_type_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (designItemTypeError || !designItemType) {
      throw new Error(`Design item type not found: ${action.design_item_type_id}`)
    }

    // Get event data to calculate deadlines
    const event = context.triggerEntity.data
    const eventDate = event.start_date || event.event_date

    if (!eventDate) {
      throw new Error('Event date is required for design item timeline calculations')
    }

    // Parse event date (YYYY-MM-DD format)
    const eventDateObj = new Date(eventDate + 'T00:00:00')

    // Calculate deadlines working backwards from event date
    // Timeline: Event Date <- Shipping <- Production <- Design <- Approval Buffer
    const totalDays =
      (designItemType.default_design_days || 0) +
      (designItemType.default_production_days || 0) +
      (designItemType.default_shipping_days || 0) +
      (designItemType.client_approval_buffer_days || 0)

    // Design deadline = event date - all days
    const designDeadline = new Date(eventDateObj)
    designDeadline.setDate(designDeadline.getDate() - totalDays)

    // Design start date = design deadline - design days
    const designStartDate = new Date(designDeadline)
    designStartDate.setDate(designStartDate.getDate() - (designItemType.default_design_days || 0))

    // Production start = design deadline (when design is complete)
    const productionStartDate = new Date(designDeadline)

    // Shipping start = production start + production days
    const shippingStartDate = new Date(productionStartDate)
    shippingStartDate.setDate(shippingStartDate.getDate() + (designItemType.default_production_days || 0))

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    // Create design item
    const { data: designItem, error: designItemError } = await supabase
      .from('event_design_items')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: context.triggerEntity.id,
        design_item_type_id: action.design_item_type_id,
        item_name: designItemType.name,
        design_start_date: formatDate(designStartDate),
        design_deadline: formatDate(designDeadline),
        production_start_date: designItemType.type === 'physical' ? formatDate(productionStartDate) : null,
        production_deadline: designItemType.type === 'physical' ? formatDate(shippingStartDate) : null,
        shipping_start_date: designItemType.type === 'physical' ? formatDate(shippingStartDate) : null,
        shipping_deadline: designItemType.type === 'physical' ? formatDate(eventDateObj) : null,
        assigned_designer_id: action.assigned_to_user_id || null,
        status: 'not_started',
        created_by: context.userId || null,
        // Workflow tracking
        auto_created: true,
        workflow_id: action.workflow_id,
      })
      .select()
      .single()

    if (designItemError || !designItem) {
      throw new Error(`Failed to create design item: ${designItemError?.message || 'Unknown error'}`)
    }

    result.success = true
    result.createdDesignItemId = designItem.id

    console.log(`[WorkflowEngine] Created design item "${designItemType.name}" (${designItem.id}) with deadline ${formatDate(designDeadline)}`)

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
const ACTION_EXECUTORS: Record<WorkflowActionType, ActionExecutor> = {
  create_task: executeCreateTaskAction,
  create_design_item: executeCreateDesignItemAction,
  // Future action types go here:
  // send_email: executeSendEmailAction,
  // send_notification: executeSendNotificationAction,
  // update_field: executeUpdateFieldAction,
  // call_webhook: executeCallWebhookAction,
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
    const { eventId, eventTypeId, tenantId, dataSourceTenantId, supabase, userId } = options

    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // DUPLICATE PREVENTION
      // ═══════════════════════════════════════════════════════════════════════════
      // Check if workflows have already been executed for this event
      const { data: existingExecutions, error: executionsError } = await supabase
        .from('workflow_executions')
        .select('workflow_id, status')
        .eq('trigger_entity_id', eventId)
        .eq('tenant_id', dataSourceTenantId)

      if (executionsError) {
        console.error('[workflowEngine] Error checking existing executions:', executionsError)
      }

      // Build a Set of workflow IDs that have already been successfully executed
      const alreadyExecutedWorkflowIds = new Set(
        existingExecutions
          ?.filter(e => e.status === 'completed' || e.status === 'partial')
          ?.map(e => e.workflow_id) || []
      )

      console.log(`[workflowEngine] Found ${alreadyExecutedWorkflowIds.size} already-executed workflows for event ${eventId}`)

      // Find all active workflows that include this event type
      // Uses PostgreSQL array containment operator (@>) to check if event_type_ids contains eventTypeId
      const { data: workflows, error: workflowsError } = await supabase
        .from('workflows')
        .select(`
          *,
          actions:workflow_actions(
            *,
            task_template:task_templates(*),
            design_item_type:design_item_types(*),
            assigned_to_user:users(id, first_name, last_name, email, department, department_role)
          )
        `)
        .eq('tenant_id', dataSourceTenantId)
        .contains('event_type_ids', [eventTypeId]) // Check if array contains this event type
        .eq('is_active', true)
        .eq('trigger_type', 'event_created')
        .order('created_at', { ascending: true })

      if (workflowsError) {
        console.error('[WorkflowEngine] Error fetching workflows:', workflowsError)
        return []
      }

      if (!workflows || workflows.length === 0) {
        console.log('[WorkflowEngine] No active workflows found for event type:', eventTypeId)
        return []
      }

      console.log(`[WorkflowEngine] Found ${workflows.length} active workflow(s) for event type`)

      // Fetch event data for context
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!event) {
        console.error('[WorkflowEngine] Event not found:', eventId)
        return []
      }

      // Filter out workflows that have already been executed (duplicate prevention)
      const workflowsToExecute = workflows.filter((workflow) => {
        if (alreadyExecutedWorkflowIds.has(workflow.id)) {
          console.log(`[workflowEngine] ⏭️  Skipping workflow ${workflow.id} (${workflow.name}) - already executed for event ${eventId}`)
          return false
        }
        return true
      })

      console.log(`[workflowEngine] Executing ${workflowsToExecute.length} of ${workflows.length} workflows`)

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
      console.error('[WorkflowEngine] Error executing workflows:', error)
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
      console.error('[WorkflowEngine] Failed to create execution record:', executionError)
      return {
        executionId: 'unknown',
        workflowId: workflow.id,
        status: 'failed',
        actionsExecuted: 0,
        actionsSuccessful: 0,
        actionsFailed: 0,
        createdTaskIds: [],
        actionResults: [],
        error: {
          message: 'Failed to create execution record',
          details: executionError,
        },
      }
    }

    console.log(`[WorkflowEngine] Executing workflow: ${workflow.name} (${workflow.id})`)

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
    }

    // Sort actions by execution_order
    const sortedActions = [...(workflow.actions || [])]
      .sort((a, b) => a.execution_order - b.execution_order)

    // Execute all actions in order
    const actionResults: ActionExecutionResult[] = []
    const createdTaskIds: string[] = []
    let actionsExecuted = 0
    let actionsSuccessful = 0
    let actionsFailed = 0

    for (const action of sortedActions) {
      console.log(`[WorkflowEngine] Executing action ${action.execution_order + 1}/${sortedActions.length}: ${action.action_type}`)

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
          if (result.createdDesignItemId) {
            // Note: Design items don't currently have workflow_execution_id field
            // This could be added in future if needed for tracking
            console.log(`[WorkflowEngine] Created design item: ${result.createdDesignItemId}`)
          }
        } else {
          actionsFailed++
          console.error(`[WorkflowEngine] Action failed:`, result.error)
        }
      } catch (error) {
        console.error(`[WorkflowEngine] Action execution error:`, error)
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

    // Update execution record
    await supabase
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        actions_executed: actionsExecuted,
        actions_successful: actionsSuccessful,
        actions_failed: actionsFailed,
        created_task_ids: createdTaskIds,
      })
      .eq('id', execution.id)

    console.log(`[WorkflowEngine] Workflow execution completed: ${finalStatus} (${actionsSuccessful}/${actionsExecuted} successful)`)

    return {
      executionId: execution.id,
      workflowId: workflow.id,
      status: finalStatus,
      actionsExecuted,
      actionsSuccessful,
      actionsFailed,
      createdTaskIds,
      actionResults,
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
    workflow: { event_type_ids: string[] },
    actions: Array<{ 
      action_type: WorkflowActionType
      task_template_id?: string | null
      design_item_type_id?: string | null
      assigned_to_user_id?: string | null
    }>,
    supabase: SupabaseClient<Database>,
    dataSourceTenantId: string
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = []
    const warnings: string[] = []

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
        // Validate design item type
        if (!action.design_item_type_id) {
          errors.push(`Action ${actionNum}: Design item type is required`)
        } else {
          const { data: designItemType } = await supabase
            .from('design_item_types')
            .select('id, is_active')
            .eq('id', action.design_item_type_id)
            .eq('tenant_id', dataSourceTenantId)
            .single()

          if (!designItemType) {
            errors.push(`Action ${actionNum}: Design item type does not exist`)
          } else if (!designItemType.is_active) {
            warnings.push(`Action ${actionNum}: Design item type is inactive`)
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

