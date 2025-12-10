/**
 * Workflow Action Executor
 *
 * Executes workflow actions for any trigger type.
 * This is a shared module used by both workflowEngine and workflowTriggerService.
 *
 * USAGE:
 * ```typescript
 * import { executeWorkflowActions } from '@/lib/services/workflowActionExecutor'
 *
 * const results = await executeWorkflowActions(
 *   actions,
 *   context,
 *   supabase,
 *   dataSourceTenantId,
 *   executionId
 * )
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createLogger } from '@/lib/logger'

const log = createLogger('services')
import type {
  WorkflowActionType,
  ActionExecutionResult,
  WorkflowExecutionContext,
  WorkflowActionWithRelations,
} from '@/types/workflows'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ActionExecutionResults {
  actionsExecuted: number
  actionsSuccessful: number
  actionsFailed: number
  createdTaskIds: string[]
  createdDesignItemIds: string[]
  createdOpsItemIds: string[]
  createdAssignmentIds: string[]
  actionResults: ActionExecutionResult[]
}

/**
 * Action executor function signature
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

/**
 * Execute a 'create_task' action
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
    if (template.default_due_in_days) {
      const due = new Date()
      due.setDate(due.getDate() + template.default_due_in_days)
      dueDate = due.toISOString()
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title: template.default_title,
        description: template.default_description,
        priority: template.default_priority,
        due_date: dueDate,
        assigned_to: action.assigned_to_user_id,
        created_by: context.userId || action.assigned_to_user_id,
        status: 'pending',
        entity_type: context.triggerEntity.type,
        entity_id: context.triggerEntity.id,
        department: template.department,
        task_type: template.task_type,
        auto_created: true,
        workflow_id: action.workflow_id,
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
    if (!action.design_item_type_id) {
      throw new Error('create_design_item action requires design_item_type_id')
    }

    // For task triggers, we need to find the associated event
    let eventId = context.triggerEntity.id
    let eventData = context.triggerEntity.data

    if (context.triggerEntity.type === 'task') {
      // Get the event from the task
      eventId = eventData.entity_id
      if (!eventId || eventData.entity_type !== 'event') {
        throw new Error('Task is not associated with an event')
      }

      // Fetch the event data
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        throw new Error(`Event not found: ${eventId}`)
      }
      eventData = event
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

    const eventDate = eventData.start_date || eventData.event_date
    if (!eventDate) {
      throw new Error('Event date is required for design item timeline calculations')
    }

    // Parse event date
    const eventDateObj = typeof eventDate === 'string' && eventDate.includes('T')
      ? new Date(eventDate)
      : new Date(eventDate + 'T00:00:00')

    // Calculate deadlines
    const totalDays =
      (designItemType.default_design_days || 0) +
      (designItemType.default_production_days || 0) +
      (designItemType.default_shipping_days || 0) +
      (designItemType.client_approval_buffer_days || 0)

    const designDeadline = new Date(eventDateObj)
    designDeadline.setDate(designDeadline.getDate() - totalDays)

    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    // Create design item
    const { data: designItem, error: designItemError } = await supabase
      .from('event_design_items')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: eventId,
        design_item_type_id: action.design_item_type_id,
        item_name: designItemType.name,
        description: `Auto-created from workflow: ${context.workflowName || 'Unnamed workflow'}`,
        quantity: 1,
        status: 'pending',
        assigned_designer_id: action.assigned_to_user_id,
        design_deadline: formatDate(designDeadline),
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
    if (!action.operations_item_type_id) {
      throw new Error('create_ops_item action requires operations_item_type_id')
    }

    // For task triggers, we need to find the associated event
    let eventId = context.triggerEntity.id
    let eventData = context.triggerEntity.data

    if (context.triggerEntity.type === 'task') {
      eventId = eventData.entity_id
      if (!eventId || eventData.entity_type !== 'event') {
        throw new Error('Task is not associated with an event')
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        throw new Error(`Event not found: ${eventId}`)
      }
      eventData = event
    }

    // Fetch operations item type
    const { data: opsItemType, error: opsItemTypeError } = await supabase
      .from('operations_item_types')
      .select('*')
      .eq('id', action.operations_item_type_id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (opsItemTypeError || !opsItemType) {
      throw new Error(`Operations item type not found: ${action.operations_item_type_id}`)
    }

    const eventDate = eventData.start_date || eventData.event_date
    if (!eventDate) {
      throw new Error('Event date is required for operations item timeline calculations')
    }

    const eventDateObj = typeof eventDate === 'string' && eventDate.includes('T')
      ? new Date(eventDate)
      : new Date(eventDate + 'T00:00:00')

    const dueDate = new Date(eventDateObj)
    dueDate.setDate(dueDate.getDate() - (opsItemType.due_date_days || 0))

    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    // Create operations item
    const { data: opsItem, error: opsItemError } = await supabase
      .from('event_operations_items')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: eventId,
        operations_item_type_id: action.operations_item_type_id,
        item_name: opsItemType.name,
        description: `Auto-created from workflow: ${context.workflowName || 'Unnamed workflow'}`,
        status: 'pending',
        assigned_to_id: action.assigned_to_user_id,
        due_date: formatDate(dueDate),
        auto_created: true,
        workflow_id: action.workflow_id,
      })
      .select()
      .single()

    if (opsItemError || !opsItem) {
      throw new Error(`Failed to create operations item: ${opsItemError?.message || 'Unknown error'}`)
    }

    result.success = true
    result.createdOpsItemId = opsItem.id
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
    if (!action.staff_role_id || !action.assigned_to_user_id) {
      throw new Error('assign_event_role action requires staff_role_id and assigned_to_user_id')
    }

    // For task triggers, get the event from the task
    let eventId = context.triggerEntity.id

    if (context.triggerEntity.type === 'task') {
      const taskData = context.triggerEntity.data
      if (!taskData.entity_id || taskData.entity_type !== 'event') {
        throw new Error('Task is not associated with an event')
      }
      eventId = taskData.entity_id
    }

    // Check for existing assignment
    const { data: existingAssignment } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .eq('staff_role_id', action.staff_role_id)
      .eq('user_id', action.assigned_to_user_id)
      .is('event_date_id', null)
      .single()

    if (existingAssignment) {
      result.success = true
      result.createdAssignmentId = existingAssignment.id
      result.output = { alreadyExisted: true }
      return result
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('event_staff_assignments')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: eventId,
        user_id: action.assigned_to_user_id,
        staff_role_id: action.staff_role_id,
        event_date_id: null,
      })
      .select()
      .single()

    if (assignmentError || !assignment) {
      throw new Error(`Failed to create staff assignment: ${assignmentError?.message || 'Unknown error'}`)
    }

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
 * Execute an 'assign_task' action (assigns a user to the triggering task)
 * Only works with task triggers
 */
const executeAssignTaskAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'assign_task',
  }

  try {
    if (!action.assigned_to_user_id) {
      throw new Error('assign_task action requires assigned_to_user_id')
    }

    // This action only works with task triggers
    if (context.triggerEntity.type !== 'task') {
      throw new Error('assign_task action only works with task triggers')
    }

    const taskId = context.triggerEntity.id

    // Update the task's assigned_to
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({
        assigned_to: action.assigned_to_user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (updateError || !task) {
      throw new Error(`Failed to assign task: ${updateError?.message || 'Unknown error'}`)
    }

    result.success = true
    result.output = { taskId, assignedTo: action.assigned_to_user_id }
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
 * Execute a 'send_email' action
 * Note: This is a placeholder implementation - actual email sending requires
 * integration with an email service (SendGrid, Resend, etc.)
 */
const executeSendEmailAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'send_email',
  }

  try {
    const config = action.config || {}
    const templateId = config.template_id
    const recipientType = config.recipient_type // 'assigned_user', 'event_contact', 'custom'
    const customEmail = config.custom_email
    const subject = config.subject
    const body = config.body

    if (!recipientType) {
      throw new Error('send_email action requires config.recipient_type')
    }

    // Determine recipient email
    let recipientEmail: string | null = null
    let recipientName: string | null = null

    if (recipientType === 'assigned_user' && action.assigned_to_user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', action.assigned_to_user_id)
        .single()

      if (user) {
        recipientEmail = user.email
        recipientName = [user.first_name, user.last_name].filter(Boolean).join(' ')
      }
    } else if (recipientType === 'event_contact' && context.triggerEntity.type === 'event') {
      // Get event contact from account
      const eventData = context.triggerEntity.data
      if (eventData.account_id) {
        const { data: account } = await supabase
          .from('accounts')
          .select('email, name')
          .eq('id', eventData.account_id)
          .single()

        if (account) {
          recipientEmail = account.email
          recipientName = account.name
        }
      }
    } else if (recipientType === 'custom' && customEmail) {
      recipientEmail = customEmail
      recipientName = config.custom_name || null
    }

    if (!recipientEmail) {
      throw new Error('Could not determine email recipient')
    }

    // TODO: Integrate with actual email service
    // For now, just log the email details and mark as success
    log.debug({
      to: recipientEmail,
      toName: recipientName,
      templateId,
      subject,
      body,
      context: {
        triggerType: context.triggerType,
        triggerEntityType: context.triggerEntity.type,
        triggerEntityId: context.triggerEntity.id,
      },
    })

    // Create a record in a notifications/emails log table if it exists
    // For now, just mark as success
    result.success = true
    result.output = {
      recipientEmail,
      recipientName,
      templateId,
      subject,
      note: 'Email queued (integration pending)',
    }
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
 * Execute a 'send_notification' action
 * Creates an in-app notification for a user
 */
const executeSendNotificationAction: ActionExecutor = async (
  action,
  context,
  supabase,
  dataSourceTenantId
) => {
  const result: ActionExecutionResult = {
    success: false,
    actionId: action.id,
    actionType: 'send_notification',
  }

  try {
    if (!action.assigned_to_user_id) {
      throw new Error('send_notification action requires assigned_to_user_id')
    }

    const config = action.config || {}
    const message = config.message || 'You have a new notification'
    const title = config.title || 'Workflow Notification'
    const priority = config.priority || 'normal'
    const link = config.link // Optional link to relevant entity

    // Build the link based on trigger entity if not provided
    let notificationLink = link
    if (!notificationLink) {
      if (context.triggerEntity.type === 'event') {
        notificationLink = `/events/${context.triggerEntity.id}`
      } else if (context.triggerEntity.type === 'task') {
        notificationLink = `/tasks/${context.triggerEntity.id}`
      }
    }

    // Check if notifications table exists
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        tenant_id: dataSourceTenantId,
        user_id: action.assigned_to_user_id,
        title,
        message,
        priority,
        link: notificationLink,
        read: false,
        workflow_id: action.workflow_id,
        entity_type: context.triggerEntity.type,
        entity_id: context.triggerEntity.id,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      // If table doesn't exist, log but don't fail
      if (insertError.code === '42P01') {
        log.debug('Notifications table not found, skipping insert')
        result.success = true
        result.output = {
          userId: action.assigned_to_user_id,
          title,
          message,
          note: 'Notification logged (table not found)',
        }
        return result
      }
      throw new Error(`Failed to create notification: ${insertError.message}`)
    }

    result.success = true
    result.output = {
      userId: action.assigned_to_user_id,
      title,
      message,
      link: notificationLink,
    }
    return result
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
    return result
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION EXECUTOR REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const ACTION_EXECUTORS: Record<WorkflowActionType, ActionExecutor> = {
  // Creation actions
  create_task: executeCreateTaskAction,
  create_design_item: executeCreateDesignItemAction,
  create_ops_item: executeCreateOpsItemAction,
  // Assignment actions
  assign_event_role: executeAssignEventRoleAction,
  assign_task: executeAssignTaskAction,
  // Communication actions
  send_email: executeSendEmailAction,
  send_notification: executeSendNotificationAction,
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute all actions for a workflow
 */
export async function executeWorkflowActions(
  actions: WorkflowActionWithRelations[],
  context: WorkflowExecutionContext,
  supabase: SupabaseClient<Database>,
  dataSourceTenantId: string,
  executionId?: string
): Promise<ActionExecutionResults> {
  const actionResults: ActionExecutionResult[] = []
  const createdTaskIds: string[] = []
  const createdDesignItemIds: string[] = []
  const createdOpsItemIds: string[] = []
  const createdAssignmentIds: string[] = []
  let actionsExecuted = 0
  let actionsSuccessful = 0
  let actionsFailed = 0

  for (const action of actions) {
    log.debug(`Executing action ${action.execution_order + 1}: ${action.action_type}`)

    try {
      const executor = ACTION_EXECUTORS[action.action_type]
      if (!executor) {
        throw new Error(`No executor found for action type: ${action.action_type}`)
      }

      const result = await executor(action, context, supabase, dataSourceTenantId)

      actionResults.push(result)
      actionsExecuted++

      if (result.success) {
        actionsSuccessful++

        if (result.createdTaskId) {
          createdTaskIds.push(result.createdTaskId)
          // Update task with execution_id if provided
          if (executionId) {
            await supabase
              .from('tasks')
              .update({ workflow_execution_id: executionId })
              .eq('id', result.createdTaskId)
          }
        }

        if (result.createdDesignItemId) {
          createdDesignItemIds.push(result.createdDesignItemId)
          if (executionId) {
            await supabase
              .from('event_design_items')
              .update({ workflow_execution_id: executionId })
              .eq('id', result.createdDesignItemId)
          }
        }

        if (result.createdOpsItemId) {
          createdOpsItemIds.push(result.createdOpsItemId)
          if (executionId) {
            await supabase
              .from('event_operations_items')
              .update({ workflow_execution_id: executionId })
              .eq('id', result.createdOpsItemId)
          }
        }

        if (result.createdAssignmentId) {
          createdAssignmentIds.push(result.createdAssignmentId)
        }
      } else {
        actionsFailed++
        console.error(`[WorkflowActionExecutor] Action failed:`, result.error)
      }
    } catch (error) {
      log.error({ error }, '[WorkflowActionExecutor] Action execution error')
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

  return {
    actionsExecuted,
    actionsSuccessful,
    actionsFailed,
    createdTaskIds,
    createdDesignItemIds,
    createdOpsItemIds,
    createdAssignmentIds,
    actionResults,
  }
}
