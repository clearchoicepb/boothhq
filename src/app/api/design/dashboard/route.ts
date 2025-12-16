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
        template:task_templates(id, name, task_type, days_before_event, urgent_threshold_days, missed_deadline_days),
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, avatar_url, department),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name),
        approved_by_user:users!tasks_approved_by_fkey(id, first_name, last_name),
        event:events!inner(
          id,
          title,
          event_name,
          start_date,
          event_date,
          event_dates(event_date),
          account:accounts(id, name)
        )
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

    // Helper function to check if a status represents completion
    const isCompletedStatus = (statusSlug: string) => COMPLETION_STATUSES.includes(statusSlug)

    // Calculate stats with new event-based logic
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const items = (designTasks || []).map(task => {
      // Get earliest event date
      const eventDate = task.event?.event_dates?.[0]?.event_date || task.event?.start_date || task.event?.event_date

      // Use design_deadline if no event date available
      const deadlineDate = task.design_deadline || task.due_date

      if (!eventDate && !deadlineDate) {
        return {
          ...task,
          calculated_status: 'pending',
          // Map fields for backwards compatibility with frontend
          item_name: task.title,
          assigned_designer: task.assigned_user,
          assigned_designer_id: task.assigned_to,
          design_item_type: task.template
        }
      }

      // Calculate days until event or deadline
      let daysUntilEvent: number
      if (eventDate) {
        const eventDateTime = new Date(eventDate)
        eventDateTime.setHours(0, 0, 0, 0)
        daysUntilEvent = Math.ceil((eventDateTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      } else {
        const deadlineDateTime = new Date(deadlineDate!)
        deadlineDateTime.setHours(0, 0, 0, 0)
        daysUntilEvent = Math.ceil((deadlineDateTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Use template thresholds if available, otherwise use defaults
      const template = task.template
      const dueDateDays = template?.days_before_event || 21
      const urgentThresholdDays = template?.urgent_threshold_days || 14
      const missedDeadlineDays = template?.missed_deadline_days || 13

      // Calculate status based on days until event
      let calculated_status = 'on_time'

      if (isCompletedStatus(task.status)) {
        calculated_status = 'completed'
      } else if (daysUntilEvent <= missedDeadlineDays) {
        calculated_status = 'missed_deadline'
      } else if (daysUntilEvent <= urgentThresholdDays) {
        calculated_status = 'urgent'
      } else if (daysUntilEvent <= dueDateDays) {
        calculated_status = 'due_soon'
      }

      return {
        ...task,
        calculated_status,
        days_until_event: daysUntilEvent,
        // Map fields for backwards compatibility with frontend
        item_name: task.title,
        assigned_designer: task.assigned_user,
        assigned_designer_id: task.assigned_to,
        design_item_type: task.template
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

    const completed = items.filter(item =>
      isCompletedStatus(item.status)
    )

    // Physical items count (based on template type if available)
    const physicalItems = items.filter(item =>
      item.template?.task_type === 'physical' &&
      !isCompletedStatus(item.status)
    )

    // Recent completions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 24 * 1000)
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
        completed: completed.length,
        recentCompletions: recentCompletions.length,
        physicalItems: physicalItems.length
      },
      categories: {
        missedDeadline,
        urgent,
        dueSoon,
        onTime,
        completed: recentCompletions.slice(0, 10)
      }
    })
  } catch (error: any) {
    log.error({ error }, 'Error fetching design dashboard')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
