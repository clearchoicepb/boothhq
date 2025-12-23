import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tasks')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Event data structure for tasks linked to events
interface EventInfo {
  id: string
  title: string
  event_dates: Array<{ event_date: string }>
}

// Project data structure for tasks linked to projects
interface ProjectInfo {
  id: string
  name: string
}

// Parent task data structure for subtasks
interface ParentTaskInfo {
  id: string
  title: string
}

export async function GET(request: Request) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const priority = searchParams.get('priority')
    const sortBy = searchParams.get('sortBy') || 'due_date'

    // Build query to fetch tasks assigned to current user
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('assigned_to', session.user.id)

    // Apply filters
    if (status === 'active') {
      query = query.neq('status', 'completed')
    } else if (status === 'completed') {
      query = query.eq('status', 'completed')
    } else if (status) {
      query = query.eq('status', status)
    }

    if (department) {
      query = query.eq('department', department)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    // Apply sorting
    if (sortBy === 'due_date') {
      query = query.order('due_date', { ascending: true, nullsFirst: false })
    } else if (sortBy === 'priority') {
      // PostgreSQL can't sort by enum order directly, so we'll sort client-side
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: tasks, error } = await query

    if (error) {
      log.error({ error }, '[MyTasks] Error fetching tasks')
      throw error
    }

    // Fetch event data for tasks linked to events
    const eventTaskIds = (tasks || [])
      .filter(t => t.entity_type === 'event' && t.entity_id)
      .map(t => t.entity_id!)

    const uniqueEventIds = [...new Set(eventTaskIds)]
    const eventsMap: Record<string, EventInfo> = {}

    if (uniqueEventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, event_dates(event_date)')
        .eq('tenant_id', dataSourceTenantId)
        .in('id', uniqueEventIds)

      if (events) {
        events.forEach((event: EventInfo) => {
          eventsMap[event.id] = event
        })
      }
    }

    // Fetch project data for tasks linked to projects
    // Support both legacy entity_type/entity_id pattern AND new project_id FK
    const projectTaskIdsFromEntity = (tasks || [])
      .filter(t => t.entity_type === 'project' && t.entity_id)
      .map(t => t.entity_id!)

    const projectTaskIdsFromFK = (tasks || [])
      .filter(t => t.project_id)
      .map(t => t.project_id!)

    const uniqueProjectIds = [...new Set([...projectTaskIdsFromEntity, ...projectTaskIdsFromFK])]
    const projectsMap: Record<string, ProjectInfo> = {}

    if (uniqueProjectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('tenant_id', dataSourceTenantId)
        .in('id', uniqueProjectIds)

      if (projects) {
        projects.forEach((project: ProjectInfo) => {
          projectsMap[project.id] = project
        })
      }
    }

    // Fetch parent task data for subtasks
    const parentTaskIds = (tasks || [])
      .filter(t => t.parent_task_id)
      .map(t => t.parent_task_id!)

    const uniqueParentTaskIds = [...new Set(parentTaskIds)]
    const parentTasksMap: Record<string, ParentTaskInfo> = {}

    if (uniqueParentTaskIds.length > 0) {
      const { data: parentTasks } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('tenant_id', dataSourceTenantId)
        .in('id', uniqueParentTaskIds)

      if (parentTasks) {
        parentTasks.forEach((task: ParentTaskInfo) => {
          parentTasksMap[task.id] = task
        })
      }
    }

    // Attach event, project, and parent task info to tasks
    const tasksWithEntities = (tasks || []).map(task => {
      // Start with base task and add parent task info if it's a subtask
      let enrichedTask = {
        ...task,
        parent_task: task.parent_task_id && parentTasksMap[task.parent_task_id]
          ? parentTasksMap[task.parent_task_id]
          : null
      }

      // Add event info
      if (task.entity_type === 'event' && task.entity_id && eventsMap[task.entity_id]) {
        enrichedTask = {
          ...enrichedTask,
          event: eventsMap[task.entity_id]
        }
      }
      // Support both legacy entity_type/entity_id pattern AND new project_id FK
      if (task.project_id && projectsMap[task.project_id]) {
        enrichedTask = {
          ...enrichedTask,
          project: projectsMap[task.project_id]
        }
      } else if (task.entity_type === 'project' && task.entity_id && projectsMap[task.entity_id]) {
        enrichedTask = {
          ...enrichedTask,
          project: projectsMap[task.entity_id]
        }
      }
      return enrichedTask
    })

    return NextResponse.json({ tasks: tasksWithEntities })
  } catch (error: any) {
    log.error({ error }, '[MyTasks] Error')
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

