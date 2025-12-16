/**
 * Design Dashboard API
 *
 * Updated to use unified tasks table (task_type = 'design')
 * instead of deprecated event_design_items table.
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:design')

// Completion statuses for the unified task system
const COMPLETION_STATUSES = ['completed', 'approved', 'cancelled']

export async function GET(request: Request) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context
  try {
    const { searchParams } = new URL(request.url)
    const designerId = searchParams.get('designer_id')
    const status = searchParams.get('status')

    // Query unified tasks table with task_type = 'design'
    let query = supabase
      .from('tasks')
      .select(`
        *,
        template:task_templates(id, name, task_type, due_date_days, urgent_threshold_days, missed_deadline_days),
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url, department),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('task_type', 'design')
      .order('design_deadline', { ascending: true, nullsFirst: false })

    // Apply filters
    if (designerId) {
      query = query.eq('assigned_to', designerId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: designTasks, error } = await query

    if (error) throw error

    log.debug({ taskCount: designTasks?.length }, 'Design tasks fetched')

    // Fetch event data for tasks linked to events (same pattern as My Tasks)
    const eventTaskIds = (designTasks || [])
      .filter(t => t.entity_type === 'event' && t.entity_id)
      .map(t => t.entity_id!)

    const uniqueEventIds = [...new Set(eventTaskIds)]
    const eventsMap: Record<string, any> = {}

    log.debug({ uniqueEventIds }, 'Fetching events')

    if (uniqueEventIds.length > 0) {
      // Use same query pattern as My Tasks which works
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_date, event_dates(event_date), account:accounts(id, name)')
        .eq('tenant_id', dataSourceTenantId)
        .in('id', uniqueEventIds)

      if (eventsError) {
        log.error({ eventsError }, 'Error fetching events for design dashboard')
      } else {
        log.debug({ eventsFound: events?.length || 0 }, 'Events query result')
        if (events) {
          events.forEach((event: any) => {
            eventsMap[event.id] = event
          })
        }
      }
    }

    // Helper function to check if a status represents completion
    const isCompletedStatus = (statusSlug: string) => COMPLETION_STATUSES.includes(statusSlug)

    // Calculate stats with new event-based logic
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const items = (designTasks || []).map(task => {
      // Attach event data from map (same pattern as My Tasks)
      const event = task.entity_type === 'event' && task.entity_id && eventsMap[task.entity_id]
        ? eventsMap[task.entity_id]
        : null

      // Get earliest event date
      const eventDate = event?.event_dates?.[0]?.event_date || event?.start_date

      // Use design_deadline if no event date available
      const deadlineDate = task.design_deadline || task.due_date

      // Calculate days until event or deadline
      let daysUntilEvent: number | null = null
      let calculated_status = 'pending'

      if (eventDate) {
        const eventDateTime = new Date(eventDate)
        eventDateTime.setHours(0, 0, 0, 0)
        daysUntilEvent = Math.ceil((eventDateTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      } else if (deadlineDate) {
        const deadlineDateTime = new Date(deadlineDate)
        deadlineDateTime.setHours(0, 0, 0, 0)
        daysUntilEvent = Math.ceil((deadlineDateTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }

      if (daysUntilEvent !== null) {
        // Use template thresholds if available, otherwise use defaults
        const template = task.template
        const dueDateDays = template?.due_date_days || 21
        const urgentThresholdDays = template?.urgent_threshold_days || 14
        const missedDeadlineDays = template?.missed_deadline_days || 13

        // Calculate status based on days until event
        if (isCompletedStatus(task.status)) {
          calculated_status = 'completed'
        } else if (daysUntilEvent <= missedDeadlineDays) {
          calculated_status = 'missed_deadline'
        } else if (daysUntilEvent <= urgentThresholdDays) {
          calculated_status = 'urgent'
        } else if (daysUntilEvent <= dueDateDays) {
          calculated_status = 'due_soon'
        } else {
          calculated_status = 'on_time'
        }
      } else if (isCompletedStatus(task.status)) {
        calculated_status = 'completed'
      }

      return {
        ...task,
        event,
        calculated_status,
        days_until_event: daysUntilEvent,
        // Map fields for backwards compatibility with frontend
        item_name: task.title,
        assigned_designer: task.assigned_user,
        assigned_designer_id: task.assigned_to,
        design_item_type: task.template,
        design_deadline: task.design_deadline || task.due_date
      }
    })

    // Categorize items based on new status logic
    const missedDeadline = items.filter(item =>
      item.calculated_status === 'missed_deadline' &&
      !isCompletedStatus(item.status)
    )

    const urgent = items.filter(item =>
      item.calculated_status === 'urgent' &&
      !isCompletedStatus(item.status)
    )

    const dueSoon = items.filter(item =>
      item.calculated_status === 'due_soon' &&
      !isCompletedStatus(item.status)
    )

    const onTime = items.filter(item =>
      item.calculated_status === 'on_time' &&
      !isCompletedStatus(item.status)
    )

    const pending = items.filter(item =>
      item.calculated_status === 'pending' &&
      !isCompletedStatus(item.status)
    )

    const completed = items.filter(item =>
      isCompletedStatus(item.status)
    )

    // Physical items count (based on template type if available)
    const physicalItems = items.filter(item =>
      item.template?.task_type === 'physical' &&
      !isCompletedStatus(item.status)
    )

    // Recent completions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentCompletions = completed.filter(item => {
      const completedAt = item.completed_at ? new Date(item.completed_at) : null
      return completedAt && completedAt >= sevenDaysAgo
    })

    return NextResponse.json({
      items,
      stats: {
        total: items.length,
        missedDeadline: missedDeadline.length,
        urgent: urgent.length,
        dueSoon: dueSoon.length,
        onTime: onTime.length,
        pending: pending.length,
        completed: completed.length,
        recentCompletions: recentCompletions.length,
        physicalItems: physicalItems.length
      },
      categories: {
        missedDeadline,
        urgent,
        dueSoon,
        onTime,
        pending,
        completed: recentCompletions.slice(0, 10)
      }
    })
  } catch (error: any) {
    log.error({ error }, 'Error fetching design dashboard')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
