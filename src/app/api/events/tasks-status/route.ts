import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { filterPreEventTasks } from '@/lib/utils/event-readiness'

const log = createLogger('api:events')
/**
 * GET /api/events/tasks-status
 *
 * Returns task status for multiple events efficiently
 * Used for red dot indicators on event cards/rows
 * Only considers pre-event tasks (tasks with due_date on or before the event date)
 */
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const eventIds = idsParam ? idsParam.split(',').filter(Boolean) : []

    if (eventIds.length === 0) {
      return NextResponse.json({ taskStatus: {} })
    }

    // Fetch incomplete tasks for these events
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, entity_id, due_date, status')
      .eq('entity_type', 'event')
      .in('entity_id', eventIds)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error fetching task status')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch events to get their first event date (for filtering pre-event tasks)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, start_date, event_dates(event_date)')
      .in('id', eventIds)
      .eq('tenant_id', dataSourceTenantId)

    if (eventsError) {
      log.error({ error: eventsError }, 'Error fetching events for task status')
    }

    // Build a map of event IDs to their first event date
    const eventDatesMap: Record<string, string | null> = {}
    events?.forEach(event => {
      const sortedDates = (event.event_dates || [])
        .map((d: any) => d.event_date)
        .filter(Boolean)
        .sort()
      eventDatesMap[event.id] = sortedDates[0] || event.start_date || null
    })

    // Calculate status for each event
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const taskStatus: Record<string, {
      hasTasks: boolean
      isOverdue: boolean
      isDueSoon: boolean
    }> = {}

    // Group tasks by event
    const tasksByEvent = (tasks || []).reduce((acc, task) => {
      if (!acc[task.entity_id]) acc[task.entity_id] = []
      acc[task.entity_id].push(task)
      return acc
    }, {} as Record<string, typeof tasks>)

    // Determine status for each event (only considering pre-event tasks)
    eventIds.forEach(eventId => {
      const allEventTasks = tasksByEvent[eventId] || []
      const eventDate = eventDatesMap[eventId]

      // Filter to only pre-event tasks
      const eventTasks = filterPreEventTasks(
        allEventTasks.map(t => ({ id: t.id, status: t.status, due_date: t.due_date })),
        eventDate
      )

      if (eventTasks.length === 0) {
        taskStatus[eventId] = { hasTasks: false, isOverdue: false, isDueSoon: false }
        return
      }

      let hasOverdue = false
      let hasDueSoon = false

      eventTasks.forEach(task => {
        if (!task.due_date) return

        // Normalize due date
        const normalizedDueDate = task.due_date.includes('T') ? task.due_date : `${task.due_date}T00:00:00`
        const dueDate = new Date(normalizedDueDate)

        if (dueDate < now) {
          hasOverdue = true
        } else if (dueDate <= tomorrow) {
          hasDueSoon = true
        }
      })

      taskStatus[eventId] = {
        hasTasks: true,
        isOverdue: hasOverdue,
        isDueSoon: hasDueSoon || hasOverdue
      }
    })

    const response = NextResponse.json({ taskStatus })
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')

    return response
  } catch (error) {
    log.error({ error }, 'Error in events tasks-status API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

