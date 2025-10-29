import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

/**
 * GET /api/events/priority-stats
 *
 * Returns priority-focused statistics for operations team:
 * - Next 10 Days: Events in next 10 days with task completion %
 * - Next 45 Days with Tasks: Events with incomplete tasks
 * - All Upcoming: Total future events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

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

    // Fetch all upcoming events with task completions
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        start_date,
        end_date,
        status,
        task_completions:event_core_task_completions (
          core_task_template_id,
          is_completed
        )
      `)
      .eq('tenant_id', session.user.tenantId)
      .gte('start_date', todayStart.toISOString())
      .order('start_date', { ascending: true })

    if (eventsError) {
      console.error('Error fetching events for priority stats:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Fetch core task templates to count total tasks
    const { data: coreTasks, error: tasksError } = await supabase
      .from('core_task_templates')
      .select('id')
      .eq('tenant_id', session.user.tenantId)
      .eq('is_active', true)

    if (tasksError) {
      console.error('Error fetching core tasks:', tasksError)
    }

    const totalTasksPerEvent = coreTasks?.length || 0

    // Helper function to count completed tasks for an event
    const getCompletedTaskCount = (event: any): number => {
      if (!event.task_completions || event.task_completions.length === 0) {
        return 0
      }
      return event.task_completions.filter((tc: any) => tc.is_completed).length
    }

    // Helper function to check if event has incomplete tasks
    const hasIncompleteTasks = (event: any): boolean => {
      if (totalTasksPerEvent === 0) return false
      const completedCount = getCompletedTaskCount(event)
      return completedCount < totalTasksPerEvent
    }

    // Calculate Next 10 Days stats
    const next10DaysEvents = events?.filter(e => {
      const startDate = new Date(e.start_date)
      return startDate >= todayStart && startDate <= next10Days
    }) || []

    const next10DaysTasks = next10DaysEvents.reduce((acc, event) => {
      const completed = getCompletedTaskCount(event)
      return {
        complete: acc.complete + completed,
        total: acc.total + totalTasksPerEvent
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

    const next45DaysWithIncomplete = next45DaysEvents.filter(hasIncompleteTasks)
    const totalIncompleteTasks = next45DaysWithIncomplete.reduce((acc, event) => {
      const completed = getCompletedTaskCount(event)
      const incomplete = totalTasksPerEvent - completed
      return acc + incomplete
    }, 0)

    // Calculate All Upcoming stats
    const allUpcomingCount = events?.length || 0

    // Find furthest event date for "through" display
    let throughDate = 'Dec 2025'
    if (events && events.length > 0) {
      const furthestEvent = events[events.length - 1]
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
    console.error('Error in events priority stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
