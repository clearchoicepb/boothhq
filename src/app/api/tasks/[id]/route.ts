import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tasks')
// GET - Fetch a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date),
        project:projects!tasks_project_id_fkey(id, name, target_date),
        event:events(id, event_name, event_date, client_name, start_date),
        template:task_templates(id, name, task_type)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
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
        event:events(id, event_name, event_date, client_name, start_date),
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

    // Phase 3: Trigger task_status_changed workflows if status changed (non-blocking)
    if (previousStatus !== null && status !== undefined && previousStatus !== status) {
      try {
        const { workflowTriggerService } = await import('@/lib/services/workflowTriggerService')
        // Don't await - run in background to not block the response
        workflowTriggerService.onTaskStatusChanged({
          task,
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
    }

    return NextResponse.json({ success: true, task })
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
