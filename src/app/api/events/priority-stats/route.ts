import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { isTaskCompleted } from '@/lib/utils/event-readiness'

const log = createLogger('api:events')

/**
 * GET /api/events/priority-stats
 *
 * Returns priority-focused statistics for operations team:
 * - Next 10 Days: Events in next 10 days with task completion %
 * - Next 45 Days with Tasks: Events with incomplete tasks
 * - All Upcoming: Total future events
 *
 * Now uses the unified Tasks table instead of Core Tasks.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Calculate date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    todayStart.setHours(0, 0, 0, 0)

    const next10Days = new Date(todayStart)
    next10Days.setDate(next10Days.getDate() + 10)
    next10Days.setHours(23, 59, 59, 999)

    const next45Days = new Date(todayStart)
    next45Days.setDate(next45Days.getDate() + 45)
    next45Days.setHours(23, 59, 59, 999)

    // Fetch all events (we'll filter by date in JavaScript)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, start_date, end_date, status')
      .eq('tenant_id', dataSourceTenantId)
      .order('start_date', { ascending: true })

    if (eventsError) {
      log.error({ eventsError }, 'Error fetching events for priority stats')
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Fetch tasks for all events from the unified tasks table
    const eventIds = events?.map(e => e.id) || []
    let eventTasks: Record<string, { total: number; completed: number }> = {}

    if (eventIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, entity_id')
        .eq('tenant_id', dataSourceTenantId)
        .eq('entity_type', 'event')
        .in('entity_id', eventIds)

      if (tasksError) {
        log.error({ tasksError }, 'Error fetching tasks')
      }

      // Group tasks by event_id and calculate completion
      if (tasksData) {
        tasksData.forEach(task => {
          if (task.entity_id) {
            if (!eventTasks[task.entity_id]) {
              eventTasks[task.entity_id] = { total: 0, completed: 0 }
            }
            eventTasks[task.entity_id].total++
            if (isTaskCompleted(task.status)) {
              eventTasks[task.entity_id].completed++
            }
          }
        })
      }
    }

    // Helper function to get task stats for an event
    const getTaskStats = (eventId: string) => {
      return eventTasks[eventId] || { total: 0, completed: 0 }
    }

    // Helper function to check if event has incomplete tasks
    const hasIncompleteTasks = (eventId: string): boolean => {
      const stats = getTaskStats(eventId)
      if (stats.total === 0) return false
      return stats.completed < stats.total
    }

    // Calculate Next 10 Days stats
    const next10DaysEvents = events?.filter(e => {
      const startDate = new Date(e.start_date)
      return startDate >= todayStart && startDate <= next10Days
    }) || []

    const next10DaysTasks = next10DaysEvents.reduce((acc, event) => {
      const stats = getTaskStats(event.id)
      return {
        complete: acc.complete + stats.completed,
        total: acc.total + stats.total
      }
    }, { complete: 0, total: 0 })

    const next10DaysCompletionPercentage = next10DaysTasks.total > 0
      ? Math.round((next10DaysTasks.complete / next10DaysTasks.total) * 100)
      : 100

    // Calculate Next 45 Days with incomplete tasks
    const next45DaysEvents = events?.filter(e => {
      const startDate = new Date(e.start_date)
      return startDate >= todayStart && startDate <= next45Days
    }) || []

    const next45DaysWithIncomplete = next45DaysEvents.filter(e => hasIncompleteTasks(e.id))
    const totalIncompleteTasks = next45DaysWithIncomplete.reduce((acc, event) => {
      const stats = getTaskStats(event.id)
      return acc + (stats.total - stats.completed)
    }, 0)

    // Calculate All Upcoming stats (filter to future events only)
    const upcomingEvents = events?.filter(e => {
      const startDate = new Date(e.start_date)
      return startDate >= todayStart
    }) || []

    const allUpcomingCount = upcomingEvents.length

    // Find furthest event date for "through" display
    let throughDate = 'Dec 2025'
    if (upcomingEvents && upcomingEvents.length > 0) {
      const furthestEvent = upcomingEvents[upcomingEvents.length - 1]
      if (furthestEvent?.start_date) {
        const date = new Date(furthestEvent.start_date)
        throughDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
    }

    const stats = {
      next10Days: {
        count: next10DaysEvents.length,
        tasksComplete: next10DaysTasks.complete,
        tasksTotal: next10DaysTasks.total,
        completionPercentage: next10DaysCompletionPercentage
      },
      next45DaysWithTasks: {
        count: next45DaysWithIncomplete.length,
        incompleteTasks: totalIncompleteTasks
      },
      allUpcoming: {
        count: allUpcomingCount,
        throughDate
      }
    }

    const response = NextResponse.json(stats)

    // Cache for 30 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return response
  } catch (error) {
    log.error({ error }, 'Error in events priority stats API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
