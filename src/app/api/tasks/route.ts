import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isValidDepartmentId } from '@/lib/departments'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tasks')

// GET - Fetch tasks with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)

    // Parse filters from query params
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const projectId = searchParams.get('projectId') // Direct FK filter for project tasks
    const assignedTo = searchParams.get('assignedTo')
    const createdBy = searchParams.get('createdBy')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const department = searchParams.get('department')
    const taskType = searchParams.get('taskType')
    const dueDateFrom = searchParams.get('dueDateFrom')
    const dueDateTo = searchParams.get('dueDateTo')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Subtask filters (added 2025-12-23)
    const parentTaskId = searchParams.get('parentTaskId')
    const excludeSubtasks = searchParams.get('excludeSubtasks') === 'true'
    const includeSubtaskProgress = searchParams.get('includeSubtaskProgress') === 'true'

    // Build query with relations
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date),
        project:projects!tasks_project_id_fkey(id, name, target_date)
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId)
    }

    // Project ID filter (direct FK for project tasks)
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    // Department filter (NEW)
    if (department && department !== 'all') {
      if (isValidDepartmentId(department)) {
        query = query.eq('department', department)
      }
    }

    // Task type filter (NEW)
    if (taskType) {
      query = query.eq('task_type', taskType)
    }

    // Date range filters (NEW)
    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom)
    }

    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo)
    }

    // Search filter (NEW) - searches in title and description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Subtask filters (added 2025-12-23)
    if (parentTaskId) {
      // Get subtasks of a specific parent
      query = query.eq('parent_task_id', parentTaskId)
    } else if (excludeSubtasks) {
      // Only top-level tasks (exclude subtasks from main list)
      query = query.is('parent_task_id', null)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    if (sortBy === 'due_date') {
      // Sort by due_date, nulls last
      query = query.order('due_date', { ascending, nullsFirst: false })
    } else if (sortBy === 'priority') {
      // Custom priority order: urgent > high > medium > low
      // Since we can't do custom sort in Supabase, we'll sort by string
      query = query.order('priority', { ascending })
    } else {
      query = query.order(sortBy as any, { ascending })
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: tasks, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching tasks')
      return NextResponse.json({
        error: 'Failed to fetch tasks',
        details: error.message
      }, { status: 500 })
    }

    // Enrich event-type tasks with event data
    // Tasks linked to events have entity_type='event' and entity_id=event UUID
    if (tasks && tasks.length > 0) {
      const eventTasks = tasks.filter((t: any) => t.entity_type === 'event' && t.entity_id)
      if (eventTasks.length > 0) {
        const eventIds = eventTasks.map((t: any) => t.entity_id)
        const { data: events } = await supabase
          .from('events')
          .select('id, title, event_number, start_date')
          .in('id', eventIds)

        if (events) {
          const eventMap = new Map(events.map((e: any) => [e.id, e]))
          for (const task of tasks) {
            if (task.entity_type === 'event' && task.entity_id) {
              (task as any).event = eventMap.get(task.entity_id) || null
            }
          }
        }
      }
    }

    // If includeSubtaskProgress is requested, compute progress for each task
    if (includeSubtaskProgress && tasks && tasks.length > 0) {
      // Get all task IDs that might have subtasks
      const taskIds = tasks.map((t: any) => t.id)

      // Fetch subtask counts grouped by parent
      const { data: subtaskCounts } = await supabase
        .from('tasks')
        .select('parent_task_id, status')
        .in('parent_task_id', taskIds)
        .eq('tenant_id', dataSourceTenantId)

      if (subtaskCounts) {
        // Group by parent and compute progress
        const progressMap = new Map<string, { total: number; completed: number }>()

        for (const subtask of subtaskCounts) {
          const parentId = subtask.parent_task_id
          if (!progressMap.has(parentId)) {
            progressMap.set(parentId, { total: 0, completed: 0 })
          }
          const progress = progressMap.get(parentId)!
          progress.total++
          if (subtask.status === 'completed' || subtask.status === 'approved') {
            progress.completed++
          }
        }

        // Attach progress to each task
        for (const task of tasks) {
          const progress = progressMap.get(task.id)
          if (progress) {
            (task as any).subtask_progress = progress
          }
        }
      }
    }

    return NextResponse.json(tasks || [])
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    const {
      title,
      description,
      assignedTo,
      entityType,
      entityId,
      eventDateId,
      projectId, // Direct FK for project tasks
      status = 'pending',
      priority = 'medium',
      dueDate,
      department,
      taskType,
      // Subtask fields (added 2025-12-23)
      parentTaskId,
      displayOrder,
    } = body

    if (!title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 })
    }

    // If creating a subtask, fetch parent task for inheritance
    let parentTask: any = null
    let inheritedDueDate = dueDate
    if (parentTaskId) {
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .select('id, tenant_id, due_date, entity_type, entity_id, event_date_id, project_id, department')
        .eq('id', parentTaskId)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (parentError || !parent) {
        return NextResponse.json({
          error: 'Parent task not found'
        }, { status: 404 })
      }

      parentTask = parent

      // Inherit due_date from parent if not explicitly provided
      if (!dueDate && parent.due_date) {
        inheritedDueDate = parent.due_date
      }
    }

    // Import here to avoid circular dependency issues
    const { inferDepartmentFromEntity } = await import('@/lib/departments')

    // Auto-assign department if not provided
    // Priority: explicit department > infer from entity > user's department
    let taskDepartment = department
    if (!taskDepartment && entityType) {
      taskDepartment = inferDepartmentFromEntity(entityType)
    }
    // Check departments array first, then fall back to legacy singular department
    if (!taskDepartment) {
      // Extended user properties from NextAuth session
      const extendedUser = session.user as typeof session.user & { departments?: string[]; department?: string }
      const userDepartments = extendedUser.departments
      if (userDepartments && Array.isArray(userDepartments) && userDepartments.length > 0) {
        taskDepartment = userDepartments[0] // Use first department as default
      } else if (extendedUser.department) {
        taskDepartment = extendedUser.department
      }
    }

    // For subtasks, inherit entity linkage from parent if not explicitly provided
    const finalEntityType = parentTask ? (entityType || parentTask.entity_type) : entityType
    const finalEntityId = parentTask ? (entityId || parentTask.entity_id) : entityId
    const finalEventDateId = parentTask ? (eventDateId || parentTask.event_date_id) : eventDateId
    const finalProjectId = parentTask ? (projectId || parentTask.project_id) : projectId

    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title,
        description,
        assigned_to: assignedTo || null, // Subtasks unassigned by default per design decision
        created_by: session.user.id,
        entity_type: finalEntityType || null,
        entity_id: finalEntityId || null,
        event_date_id: finalEventDateId || null,
        project_id: finalProjectId || null,
        status,
        priority,
        due_date: inheritedDueDate || null, // Inherit from parent if not provided
        department: taskDepartment || null,
        task_type: taskType || null,
        // Subtask fields (added 2025-12-23)
        parent_task_id: parentTaskId || null,
        display_order: displayOrder ?? 0,
      })
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date),
        project:projects!tasks_project_id_fkey(id, name, target_date)
      `)
      .single()

    if (createError) {
      log.error({ createError }, 'Error creating task')
      return NextResponse.json({
        error: 'Failed to create task',
        details: createError.message
      }, { status: 500 })
    }

    // Phase 3: Trigger task_created workflows (non-blocking)
    try {
      const { workflowTriggerService } = await import('@/lib/services/workflowTriggerService')
      // Don't await - run in background to not block the response
      workflowTriggerService.onTaskCreated({
        task,
        tenantId: context.tenantId,
        dataSourceTenantId,
        supabase,
        userId: session.user.id,
      }).catch((error: Error) => {
        log.error({ error }, '[Tasks API] Error triggering task_created workflows')
      })
    } catch (error) {
      log.error({ error }, '[Tasks API] Error importing workflow trigger service')
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
