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

    // Attach event info to tasks
    const tasksWithEvents = (tasks || []).map(task => {
      if (task.entity_type === 'event' && task.entity_id && eventsMap[task.entity_id]) {
        return {
          ...task,
          event: eventsMap[task.entity_id]
        }
      }
      return task
    })

    return NextResponse.json({ tasks: tasksWithEvents })
  } catch (error: any) {
    log.error({ error }, '[MyTasks] Error')
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

