import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tasks')

/**
 * POST /api/tasks/from-template
 *
 * Create a new task from a task template.
 * This endpoint fetches the template and uses its defaults to create a task,
 * while allowing overrides for specific values.
 *
 * Request body:
 * {
 *   templateId: string           // Required: ID of the task template
 *   entityType?: string           // Optional: Entity to link task to (e.g., 'opportunity', 'event')
 *   entityId?: string             // Optional: ID of the entity
 *   eventDateId?: string          // Optional: Specific event date ID
 *   assignedTo?: string           // Optional: User ID to assign task to
 *   title?: string                // Optional: Override template default title
 *   priority?: string             // Optional: Override template default priority
 *   dueDate?: string              // Optional: Override calculated due date
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()

    const {
      templateId,
      entityType,
      entityId,
      eventDateId,
      assignedTo,
      // Optional overrides
      title: titleOverride,
      priority: priorityOverride,
      dueDate: dueDateOverride,
    } = body

    // Validation
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check if template is enabled
    if (!template.enabled) {
      return NextResponse.json(
        { error: 'Template is disabled' },
        { status: 400 }
      )
    }

    // Calculate due date if not overridden
    let dueDate = dueDateOverride
    if (!dueDate && template.default_due_in_days !== null) {
      const due = new Date()
      due.setDate(due.getDate() + template.default_due_in_days)
      dueDate = due.toISOString().split('T')[0] // Format as YYYY-MM-DD
    }

    // Determine assignment
    let finalAssignedTo = assignedTo || null

    // If template requires assignment but none provided, could add logic here
    // For now, we'll just use what's provided or null

    // Create task from template
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title: titleOverride || template.default_title,
        description: template.default_description,
        assigned_to: finalAssignedTo,
        created_by: session.user.id,
        entity_type: entityType || null,
        entity_id: entityId || null,
        event_date_id: eventDateId || null,
        status: 'pending',
        priority: priorityOverride || template.default_priority,
        due_date: dueDate || null,
        department: template.department,
        task_type: template.task_type,
      })
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date)
      `)
      .single()

    if (createError) {
      log.error({ createError }, 'Error creating task from template')
      return NextResponse.json(
        { error: 'Failed to create task', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/tasks/from-template')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
