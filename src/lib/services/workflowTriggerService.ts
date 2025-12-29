/**
 * Workflow Trigger Service
 *
 * Server-side service for triggering workflows from various events.
 * This is the entry point for workflow execution from APIs.
 *
 * USAGE:
 * ```typescript
 * import { workflowTriggerService } from '@/lib/services/workflowTriggerService'
 *
 * // In your task creation API:
 * await workflowTriggerService.onTaskCreated({
 *   task: newTask,
 *   tenantId,
 *   dataSourceTenantId,
 *   supabase,
 *   userId
 * })
 *
 * // In your task update API:
 * await workflowTriggerService.onTaskStatusChanged({
 *   task: updatedTask,
 *   previousStatus: oldStatus,
 *   tenantId,
 *   dataSourceTenantId,
 *   supabase,
 *   userId
 * })
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  WorkflowTriggerType,
  WorkflowExecutionResult,
  WorkflowWithRelations,
  TriggerConfig,
  TriggerConfigTaskStatusChanged,
  TriggerConfigTaskCreated,
} from '@/types/workflows'
import { evaluateConditions } from '@/lib/services/conditionEvaluator'
import { createLogger } from '@/lib/logger'

const log = createLogger('services')

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface BaseTriggerOptions {
  tenantId: string
  dataSourceTenantId: string
  supabase: SupabaseClient<Database>
  userId?: string
}

interface TaskCreatedOptions extends BaseTriggerOptions {
  task: Record<string, any>
}

interface TaskStatusChangedOptions extends BaseTriggerOptions {
  task: Record<string, any>
  previousStatus: string
}

interface EventDateApproachingOptions extends BaseTriggerOptions {
  event: Record<string, any>
  daysUntilEvent: number
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW TRIGGER SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class WorkflowTriggerService {
  /**
   * Trigger workflows when a task is created
   */
  async onTaskCreated(options: TaskCreatedOptions): Promise<WorkflowExecutionResult[]> {
    const { task, tenantId, dataSourceTenantId, supabase, userId } = options

    log.debug('onTaskCreated called for task:', task.id)

    // Don't trigger workflows for auto-created tasks (to prevent infinite loops)
    if (task.auto_created) {
      log.debug('Skipping auto-created task to prevent loops')
      return []
    }

    try {
      // Find matching workflows
      const workflows = await this.findMatchingWorkflows({
        triggerType: 'task_created',
        tenantId: dataSourceTenantId,
        supabase,
        triggerConfig: (config: TriggerConfig) => {
          const taskConfig = config as TriggerConfigTaskCreated

          // Filter by task types if specified
          if (taskConfig.task_types && taskConfig.task_types.length > 0) {
            if (!task.task_type || !taskConfig.task_types.includes(task.task_type)) {
              return false
            }
          }

          // Filter by departments if specified
          if (taskConfig.departments && taskConfig.departments.length > 0) {
            if (!task.department || !taskConfig.departments.includes(task.department)) {
              return false
            }
          }

          return true
        },
      })

      if (workflows.length === 0) {
        log.debug('No matching task_created workflows found')
        return []
      }

      log.debug(`Found ${workflows.length} matching task_created workflow(s)`)

      // Execute each workflow
      const results = await Promise.all(
        workflows.map((workflow) =>
          this.executeWorkflow(workflow, {
            triggerType: 'task_created',
            triggerEntity: {
              type: 'task',
              id: task.id,
              data: task,
            },
            tenantId,
            dataSourceTenantId,
            supabase,
            userId,
          })
        )
      )

      return results
    } catch (error) {
      log.error({ error }, '[WorkflowTriggerService] Error in onTaskCreated')
      return []
    }
  }

  /**
   * Trigger workflows when a task status changes
   */
  async onTaskStatusChanged(options: TaskStatusChangedOptions): Promise<WorkflowExecutionResult[]> {
    const { task, previousStatus, tenantId, dataSourceTenantId, supabase, userId } = options

    log.debug({ taskId: task.id, from: previousStatus, to: task.status }, 'onTaskStatusChanged called')

    // Don't trigger if status didn't actually change
    if (previousStatus === task.status) {
      log.debug('Status unchanged, skipping')
      return []
    }

    // Don't trigger workflows for auto-created tasks (to prevent infinite loops)
    if (task.auto_created) {
      log.debug('Skipping auto-created task to prevent loops')
      return []
    }

    try {
      // Find matching workflows
      const workflows = await this.findMatchingWorkflows({
        triggerType: 'task_status_changed',
        tenantId: dataSourceTenantId,
        supabase,
        triggerConfig: (config: TriggerConfig) => {
          const statusConfig = config as TriggerConfigTaskStatusChanged

          // Filter by from_status if specified
          if (statusConfig.from_status && statusConfig.from_status !== previousStatus) {
            return false
          }

          // Filter by to_status if specified
          if (statusConfig.to_status && statusConfig.to_status !== task.status) {
            return false
          }

          return true
        },
      })

      if (workflows.length === 0) {
        log.debug('No matching task_status_changed workflows found')
        return []
      }

      log.debug(`Found ${workflows.length} matching task_status_changed workflow(s)`)

      // Execute each workflow
      const results = await Promise.all(
        workflows.map((workflow) =>
          this.executeWorkflow(workflow, {
            triggerType: 'task_status_changed',
            triggerEntity: {
              type: 'task',
              id: task.id,
              data: task,
            },
            previousData: { status: previousStatus },
            tenantId,
            dataSourceTenantId,
            supabase,
            userId,
          })
        )
      )

      return results
    } catch (error) {
      log.error({ error }, '[WorkflowTriggerService] Error in onTaskStatusChanged')
      return []
    }
  }

  /**
   * Trigger workflows for event_date_approaching (called by cron job)
   */
  async onEventDateApproaching(options: EventDateApproachingOptions): Promise<WorkflowExecutionResult[]> {
    const { event, daysUntilEvent, tenantId, dataSourceTenantId, supabase, userId } = options

    log.debug({ eventId: event.id, daysUntilEvent }, 'onEventDateApproaching called')

    try {
      // Find matching workflows where days_before matches
      const workflows = await this.findMatchingWorkflows({
        triggerType: 'event_date_approaching',
        tenantId: dataSourceTenantId,
        supabase,
        triggerConfig: (config: TriggerConfig) => {
          const daysBefore = (config as { days_before?: number }).days_before
          return daysBefore === daysUntilEvent
        },
      })

      if (workflows.length === 0) {
        log.debug('No matching event_date_approaching workflows found')
        return []
      }

      log.debug(`Found ${workflows.length} matching event_date_approaching workflow(s)`)

      // Execute each workflow
      const results = await Promise.all(
        workflows.map((workflow) =>
          this.executeWorkflow(workflow, {
            triggerType: 'event_date_approaching',
            triggerEntity: {
              type: 'event',
              id: event.id,
              data: event,
            },
            tenantId,
            dataSourceTenantId,
            supabase,
            userId,
          })
        )
      )

      return results
    } catch (error) {
      log.error({ error }, '[WorkflowTriggerService] Error in onEventDateApproaching')
      return []
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find workflows that match a specific trigger type and config
   */
  private async findMatchingWorkflows(options: {
    triggerType: WorkflowTriggerType
    tenantId: string
    supabase: SupabaseClient<Database>
    triggerConfig?: (config: TriggerConfig) => boolean
  }): Promise<WorkflowWithRelations[]> {
    const { triggerType, tenantId, supabase, triggerConfig } = options

    // Fetch all active workflows with this trigger type
    // NOTE: design_item_types table has been deprecated. Templates are looked up at action execution time.
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select(`
        *,
        actions:workflow_actions(
          *,
          task_template:task_templates(*),
          assigned_to_user:users(id, first_name, last_name, email, department, department_role)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      log.error({ error }, '[WorkflowTriggerService] Error fetching workflows')
      return []
    }

    if (!workflows || workflows.length === 0) {
      return []
    }

    // Filter by trigger config if specified
    let matchingWorkflows = workflows as WorkflowWithRelations[]
    if (triggerConfig) {
      matchingWorkflows = matchingWorkflows.filter((workflow) => {
        const config = workflow.trigger_config || {}
        return triggerConfig(config)
      })
    }

    return matchingWorkflows
  }

  /**
   * Execute a single workflow
   */
  private async executeWorkflow(
    workflow: WorkflowWithRelations,
    context: {
      triggerType: WorkflowTriggerType
      triggerEntity: {
        type: string
        id: string
        data: Record<string, any>
      }
      previousData?: Record<string, any>
      tenantId: string
      dataSourceTenantId: string
      supabase: SupabaseClient<Database>
      userId?: string
    }
  ): Promise<WorkflowExecutionResult> {
    const { triggerType, triggerEntity, previousData, tenantId, dataSourceTenantId, supabase, userId } = context

    // Import workflow engine dynamically to avoid circular dependencies
    const { workflowEngine } = await import('@/lib/services/workflowEngine')

    // Check for duplicate execution
    const { data: existingExecution } = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('workflow_id', workflow.id)
      .eq('trigger_entity_id', triggerEntity.id)
      .eq('tenant_id', dataSourceTenantId)
      .in('status', ['completed', 'partial'])
      .single()

    if (existingExecution) {
      log.debug(`Workflow ${workflow.id} already executed for ${triggerEntity.type} ${triggerEntity.id}`)
      return {
        executionId: existingExecution.id,
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
      }
    }

    // Evaluate conditions
    const conditions = workflow.conditions || []
    if (conditions.length > 0) {
      const evaluationContext = {
        [triggerEntity.type]: triggerEntity.data,
        previous: previousData,
      }

      const conditionResult = evaluateConditions(conditions, evaluationContext)

      if (!conditionResult.passed) {
        log.debug(`Workflow ${workflow.name} conditions not met, skipping`)

        // Create skipped execution record
        const { data: execution } = await supabase
          .from('workflow_executions')
          .insert({
            tenant_id: dataSourceTenantId,
            workflow_id: workflow.id,
            trigger_type: triggerType,
            trigger_entity_type: triggerEntity.type,
            trigger_entity_id: triggerEntity.id,
            status: 'skipped',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            conditions_evaluated: true,
            conditions_passed: false,
            condition_results: conditionResult as any,
            actions_executed: 0,
            actions_successful: 0,
            actions_failed: 0,
          })
          .select()
          .single()

        return {
          executionId: execution?.id || 'unknown',
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

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        tenant_id: dataSourceTenantId,
        workflow_id: workflow.id,
        trigger_type: triggerType,
        trigger_entity_type: triggerEntity.type,
        trigger_entity_id: triggerEntity.id,
        status: 'running',
        started_at: new Date().toISOString(),
        conditions_evaluated: conditions.length > 0,
        conditions_passed: conditions.length > 0 ? true : null,
      })
      .select()
      .single()

    if (executionError || !execution) {
      log.error({ executionError }, '[WorkflowTriggerService] Failed to create execution record')
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

    // Execute actions using the workflow engine's internal method
    // We need to use the same execution logic as event_created
    const executionContext = {
      tenantId,
      dataSourceTenantId,
      triggerType,
      triggerEntity,
      previousData,
      userId,
      workflowName: workflow.name,
    }

    // Sort actions by execution_order
    const sortedActions = [...(workflow.actions || [])].sort(
      (a, b) => a.execution_order - b.execution_order
    )

    // Import action executors dynamically
    const { executeWorkflowActions } = await import('@/lib/services/workflowActionExecutor')

    const actionResults = await executeWorkflowActions(
      sortedActions,
      executionContext,
      supabase,
      dataSourceTenantId,
      execution.id
    )

    // Update execution record
    const finalStatus =
      actionResults.actionsSuccessful === 0
        ? 'failed'
        : actionResults.actionsFailed > 0
        ? 'partial'
        : 'completed'

    await supabase
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        actions_executed: actionResults.actionsExecuted,
        actions_successful: actionResults.actionsSuccessful,
        actions_failed: actionResults.actionsFailed,
        created_task_ids: actionResults.createdTaskIds,
      })
      .eq('id', execution.id)

    log.debug(`Workflow ${workflow.name} execution completed: ${finalStatus}`)

    return {
      executionId: execution.id,
      workflowId: workflow.id,
      status: finalStatus,
      ...actionResults,
    }
  }
}

// Export singleton instance
export const workflowTriggerService = new WorkflowTriggerService()

// Export class for testing
export { WorkflowTriggerService }
