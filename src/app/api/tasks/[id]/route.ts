import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { createNotification } from '@/lib/services/notificationService'

const log = createLogger('api:tasks')
// GET - Fetch a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Query params for subtasks (added 2025-12-23)
    const includeSubtasks = searchParams.get('includeSubtasks') === 'true'

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date),
        project:projects!tasks_project_id_fkey(id, name, target_date),
        template:task_templates(id, name, task_type)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Fetch event data separately if entity_type is 'event' (polymorphic relationship)
    let eventData = null
    if (task.entity_type === 'event' && task.entity_id) {
      const { data: event } = await supabase
        .from('events')
        .select('id, title, start_date')
        .eq('id', task.entity_id)
        .single()
      eventData = event
    }

    // Fetch subtasks if requested (added 2025-12-23)
    let subtasks: any[] = []
    let subtaskProgress = null
    if (includeSubtasks) {
      const { data: subtaskData } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
          created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email)
        `)
        .eq('parent_task_id', id)
        .eq('tenant_id', dataSourceTenantId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (subtaskData) {
        subtasks = subtaskData
        // Compute progress
        const completed = subtaskData.filter(
          (st: any) => st.status === 'completed' || st.status === 'approved'
        ).length
        subtaskProgress = {
          total: subtaskData.length,
          completed,
        }
      }
    }

    return NextResponse.json({
      ...task,
      event: eventData,
      subtasks: includeSubtasks ? subtasks : undefined,
      subtask_progress: subtaskProgress,
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      department,
      taskType,
      entityType,
      entityId,
      eventDateId,
      projectId, // Direct FK for project tasks
      completedAt,
      // Design-specific fields (unified task model)
      quantity,
      revisionCount,
      designFileUrls,
      proofFileUrls,
      finalFileUrls,
      clientNotes,
      internalNotes,
      designDeadline,
      designStartDate,
      productId,
      // Approval workflow
      requiresApproval,
      approvalNotes,
      submittedForApprovalAt,
      approvedAt,
      approvedBy,
      // Subtask fields (added 2025-12-23)
      parentTaskId,
      displayOrder,
    } = body

    // Fetch current task to get previous status for workflow triggers
    let previousStatus: string | null = null
    let currentRevisionCount: number = 0
    if (status !== undefined || revisionCount !== undefined) {
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('status, revision_count')
        .eq('id', id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (currentTask) {
        previousStatus = currentTask.status
        currentRevisionCount = currentTask.revision_count || 0
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Basic task fields
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.due_date = dueDate
    if (department !== undefined) updateData.department = department
    if (taskType !== undefined) updateData.task_type = taskType
    if (entityType !== undefined) updateData.entity_type = entityType
    if (entityId !== undefined) updateData.entity_id = entityId
    if (eventDateId !== undefined) updateData.event_date_id = eventDateId
    if (projectId !== undefined) updateData.project_id = projectId
    if (completedAt !== undefined) updateData.completed_at = completedAt

    // Assignment handling with timestamp
    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo
      updateData.assigned_at = assignedTo ? new Date().toISOString() : null
    }

    // Design-specific fields
    if (quantity !== undefined) updateData.quantity = quantity
    if (revisionCount !== undefined) updateData.revision_count = revisionCount
    if (designFileUrls !== undefined) updateData.design_file_urls = designFileUrls
    if (proofFileUrls !== undefined) updateData.proof_file_urls = proofFileUrls
    if (finalFileUrls !== undefined) updateData.final_file_urls = finalFileUrls
    if (clientNotes !== undefined) updateData.client_notes = clientNotes
    if (internalNotes !== undefined) updateData.internal_notes = internalNotes
    if (designDeadline !== undefined) updateData.design_deadline = designDeadline
    if (designStartDate !== undefined) updateData.design_start_date = designStartDate
    if (productId !== undefined) updateData.product_id = productId

    // Approval workflow fields
    if (requiresApproval !== undefined) updateData.requires_approval = requiresApproval
    if (approvalNotes !== undefined) updateData.approval_notes = approvalNotes
    if (submittedForApprovalAt !== undefined) updateData.submitted_for_approval_at = submittedForApprovalAt
    if (approvedAt !== undefined) updateData.approved_at = approvedAt
    if (approvedBy !== undefined) updateData.approved_by = approvedBy

    // Subtask fields (added 2025-12-23)
    if (parentTaskId !== undefined) updateData.parent_task_id = parentTaskId
    if (displayOrder !== undefined) updateData.display_order = displayOrder

    // Status handling with automatic timestamp updates
    if (status !== undefined) {
      updateData.status = status

      // Handle completed status
      if ((status === 'completed' || status === 'approved') && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }
      // Clear completed_at if moving away from completed status
      if (status !== 'completed' && status !== 'approved' && status !== 'cancelled') {
        updateData.completed_at = null
      }

      // Handle approval workflow statuses
      if (status === 'in_progress' && !body.startedAt) {
        updateData.started_at = new Date().toISOString()
      }
      if (status === 'awaiting_approval' && !body.submittedForApprovalAt) {
        updateData.submitted_for_approval_at = new Date().toISOString()
      }
      if (status === 'approved' && !body.approvedAt) {
        updateData.approved_at = new Date().toISOString()
        if (session?.user?.id) {
          updateData.approved_by = session.user.id
        }
      }
      if (status === 'needs_revision') {
        // Increment revision count when sent back for revision
        updateData.revision_count = currentRevisionCount + 1
      }
    }

    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date),
        project:projects!tasks_project_id_fkey(id, name, target_date),
        template:task_templates(id, name, task_type)
      `)
      .single()

    if (updateError) {
      log.error({ updateError }, 'Error updating task')
      return NextResponse.json({
        error: 'Failed to update task',
        details: updateError.message
      }, { status: 500 })
    }

    // Fetch event data separately if entity_type is 'event' (polymorphic relationship)
    let eventData = null
    if (task.entity_type === 'event' && task.entity_id) {
      const { data: event } = await supabase
        .from('events')
        .select('id, title, start_date')
        .eq('id', task.entity_id)
        .single()
      eventData = event
    }

    const taskWithEvent = { ...task, event: eventData }

    // Phase 3: Trigger task_status_changed workflows if status changed (non-blocking)
    if (previousStatus !== null && status !== undefined && previousStatus !== status) {
      try {
        const { workflowTriggerService } = await import('@/lib/services/workflowTriggerService')
        // Don't await - run in background to not block the response
        workflowTriggerService.onTaskStatusChanged({
          task: taskWithEvent,
          previousStatus,
          tenantId: context.tenantId,
          dataSourceTenantId,
          supabase,
          userId: session.user.id,
        }).catch((error: Error) => {
          log.error({ error }, '[Tasks API] Error triggering task_status_changed workflows')
        })
      } catch (error) {
        log.error({ error }, '[Tasks API] Error importing workflow trigger service')
      }

      // Send notification for subtask completion
      if (
        (status === 'completed' || status === 'approved') &&
        task.parent_task_id
      ) {
        try {
          // Fetch parent task to find owner
          const { data: parentTask } = await supabase
            .from('tasks')
            .select('assigned_to, title')
            .eq('id', task.parent_task_id)
            .single()

          // Notify parent task owner if they're different from current user
          if (parentTask?.assigned_to && parentTask.assigned_to !== session.user.id) {
            await createNotification({
              supabase,
              tenantId: dataSourceTenantId,
              userId: parentTask.assigned_to,
              type: 'subtask_completed',
              title: 'Subtask completed',
              message: `"${task.title}" has been marked complete`,
              entityType: 'task',
              entityId: task.parent_task_id,
              linkUrl: task.entity_type === 'event'
                ? `/events/${task.entity_id}?tab=planning&section=tasks&taskId=${task.id}`
                : `/tasks/${task.parent_task_id}`,
              actorName: session.user.name || 'Team member',
            })
          }
        } catch (notifyError) {
          // Log but don't fail - notification is not critical
          log.error({ error: notifyError }, 'Error sending subtask completion notification')
        }
      }
    }

    return NextResponse.json({ success: true, task: taskWithEvent })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const { id } = await params
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      log.error({ deleteError }, 'Error deleting task')
      return NextResponse.json({
        error: 'Failed to delete task',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
