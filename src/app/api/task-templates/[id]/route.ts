import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isValidDepartmentId } from '@/lib/departments'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:task-templates')

/**
 * GET /api/task-templates/[id]
 *
 * Get a single task template by ID.
 * Only returns if template belongs to current tenant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/task-templates/[id]')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/task-templates/[id]
 *
 * Update a task template.
 * Only admins and tenant_admins can update templates.
 *
 * Request body: Partial template data to update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Authorization check
    if (session.user.role !== 'admin' && session.user.role !== 'tenant_admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can update task templates.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updates: any = {}

    // Only update fields that are provided
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.department !== undefined) {
      if (!isValidDepartmentId(body.department)) {
        return NextResponse.json(
          { error: 'Invalid department ID' },
          { status: 400 }
        )
      }
      updates.department = body.department
    }
    if (body.task_type !== undefined) updates.task_type = body.task_type
    if (body.default_title !== undefined) updates.default_title = body.default_title
    if (body.default_description !== undefined) {
      updates.default_description = body.default_description
    }
    if (body.default_priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(body.default_priority)) {
        return NextResponse.json(
          { error: 'Invalid priority. Must be: low, medium, high, or urgent' },
          { status: 400 }
        )
      }
      updates.default_priority = body.default_priority
    }
    if (body.default_due_in_days !== undefined) {
      updates.default_due_in_days = body.default_due_in_days
    }
    if (body.requires_assignment !== undefined) {
      updates.requires_assignment = body.requires_assignment
    }
    if (body.enabled !== undefined) updates.enabled = body.enabled
    if (body.display_order !== undefined) updates.display_order = body.display_order

    // Event-based due date calculation fields
    if (body.use_event_date !== undefined) {
      updates.use_event_date = body.use_event_date
    }
    if (body.days_before_event !== undefined) {
      updates.days_before_event = body.days_before_event
    }

    // Task timing
    if (body.task_timing !== undefined) {
      const validTimings = ['pre_event', 'post_event', 'general']
      if (!validTimings.includes(body.task_timing)) {
        return NextResponse.json(
          { error: 'Invalid task_timing. Must be: pre_event, post_event, or general' },
          { status: 400 }
        )
      }
      updates.task_timing = body.task_timing
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('task_templates')
      .update(updates)
      .eq('id', params.id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error updating task template')
      return NextResponse.json(
        { error: 'Failed to update template', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, template: data })
  } catch (error) {
    log.error({ error }, 'Error in PATCH /api/task-templates/[id]')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/task-templates/[id]
 *
 * Delete a task template.
 * Only admins and tenant_admins can delete templates.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Authorization check
    if (session.user.role !== 'admin' && session.user.role !== 'tenant_admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete task templates.' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting task template')
      return NextResponse.json(
        { error: 'Failed to delete template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error in DELETE /api/task-templates/[id]')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
