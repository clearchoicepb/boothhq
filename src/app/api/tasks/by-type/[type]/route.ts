/**
 * GET /api/tasks/by-type/[type]
 *
 * Get all tasks of a specific type (design, operations, etc.)
 * Replaces /api/design/dashboard and similar endpoints
 *
 * This is the unified endpoint for fetching tasks by type,
 * eliminating the need for separate design/operations APIs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { UnifiedTaskType } from '@/types/tasks'

const log = createLogger('api:tasks:by-type')

const VALID_TASK_TYPES: UnifiedTaskType[] = ['general', 'design', 'operations', 'sales', 'admin', 'project', 'misc']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { type: taskType } = await params

    // Validate task type
    if (!VALID_TASK_TYPES.includes(taskType as UnifiedTaskType)) {
      return NextResponse.json(
        { error: `Invalid task type. Valid types: ${VALID_TASK_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assigned_to')
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    const requiresApproval = searchParams.get('requires_approval')
    const includeCompleted = searchParams.get('include_completed') === 'true'

    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name),
        template:task_templates(id, name, task_type)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('task_type', taskType)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    } else if (!includeCompleted) {
      // By default, exclude completed/cancelled/approved tasks
      query = query.not('status', 'in', '("completed","cancelled","approved")')
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    if (requiresApproval !== null) {
      query = query.eq('requires_approval', requiresApproval === 'true')
    }

    // Order by due date, with nulls last
    const { data: tasks, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      log.error({ error }, 'Error fetching tasks by type')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch event data for tasks linked to events (polymorphic relationship)
    const eventTasks = (tasks || []).filter(t => t.entity_type === 'event' && t.entity_id)
    const eventIds = [...new Set(eventTasks.map(t => t.entity_id))]

    let eventsMap: Record<string, any> = {}
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, event_name, event_date, client_name, start_date')
        .in('id', eventIds)

      if (events) {
        eventsMap = Object.fromEntries(events.map(e => [e.id, e]))
      }
    }

    // Attach event data to tasks
    const data = (tasks || []).map(task => ({
      ...task,
      event: task.entity_type === 'event' && task.entity_id ? eventsMap[task.entity_id] || null : null
    }))

    return NextResponse.json({ data })
  } catch (error) {
    log.error({ error }, 'Error in tasks by-type API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/tasks/by-type/[type]
 *
 * Create a new task of the specified type
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { type: taskType } = await params

    // Validate task type
    if (!VALID_TASK_TYPES.includes(taskType as UnifiedTaskType)) {
      return NextResponse.json(
        { error: `Invalid task type. Valid types: ${VALID_TASK_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Build task data
    const taskData: Record<string, unknown> = {
      tenant_id: dataSourceTenantId,
      title: body.title,
      description: body.description || null,
      task_type: taskType,
      task_template_id: body.task_template_id || null,
      assigned_to: body.assigned_to || null,
      created_by: session.user.id,
      entity_type: body.entity_type || null,
      entity_id: body.entity_id || null,
      event_date_id: body.event_date_id || null,
      project_id: body.project_id || null,
      due_date: body.due_date || null,
      priority: body.priority || 'medium',
      department: body.department || taskType,
      status: 'pending',

      // Design-specific fields
      quantity: body.quantity ?? (taskType === 'design' ? 1 : null),
      requires_approval: body.requires_approval ?? (taskType === 'design'),
      design_deadline: body.design_deadline || body.due_date || null,
      design_start_date: body.design_start_date || null,
      product_id: body.product_id || null,
      client_notes: body.client_notes || null,
      internal_notes: body.internal_notes || null,

      // Timestamps
      assigned_at: body.assigned_to ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name)
      `)
      .single()

    if (error) {
      log.error({ error }, 'Error creating task')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error in tasks by-type POST API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
