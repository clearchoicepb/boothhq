import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const designerId = searchParams.get('designer_id')
    const status = searchParams.get('status')

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Build query - Now users table is in Tenant DB, so we can join directly!
    let query = supabase
      .from('event_design_items')
      .select(`
        *,
        design_item_type:design_item_types(id, name, type, due_date_days, urgent_threshold_days, missed_deadline_days),
        assigned_designer:users(id, first_name, last_name, email),
        event:events!inner(
          id,
          title,
          start_date,
          event_dates(event_date),
          account:accounts(id, name)
        )
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('design_deadline', { ascending: true })

    // Apply filters
    if (designerId) {
      query = query.eq('assigned_designer_id', designerId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: designItems, error } = await query

    if (error) throw error

    // Fetch design statuses to check which ones are completion states
    const { data: designStatuses } = await supabase
      .from('design_statuses')
      .select('slug, is_completed')
      .eq('tenant_id', session.user.tenantId)

    // Create a lookup map for completion status
    const completionStatusMap = new Map<string, boolean>()
    designStatuses?.forEach(status => {
      completionStatusMap.set(status.slug, status.is_completed || false)
    })

    // Helper function to check if a status represents completion
    const isCompletedStatus = (statusSlug: string) => completionStatusMap.get(statusSlug) === true

    // Calculate stats with new event-based logic
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const items = (designItems || []).map(item => {
      // Get earliest event date
      const eventDate = item.event?.event_dates?.[0]?.event_date || item.event?.start_date
      if (!eventDate || !item.design_item_type) return { ...item, calculated_status: 'pending' }

      const eventDateTime = new Date(eventDate)
      eventDateTime.setHours(0, 0, 0, 0)

      const daysUntilEvent = Math.ceil((eventDateTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const designType = item.design_item_type
      const dueDateDays = designType.due_date_days || 21
      const urgentThresholdDays = designType.urgent_threshold_days || 14
      const missedDeadlineDays = designType.missed_deadline_days || 13

      // Calculate status based on days until event
      let calculated_status = 'on_time'

      if (isCompletedStatus(item.status)) {
        calculated_status = 'completed'
      } else if (daysUntilEvent <= missedDeadlineDays) {
        calculated_status = 'missed_deadline'
      } else if (daysUntilEvent <= urgentThresholdDays) {
        calculated_status = 'urgent'
      } else if (daysUntilEvent <= dueDateDays) {
        calculated_status = 'due_soon'
      }

      return { ...item, calculated_status, days_until_event: daysUntilEvent }
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

    // Physical items count
    const physicalItems = items.filter(item =>
      item.design_item_type?.type === 'physical' &&
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
    console.error('Error fetching design dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
