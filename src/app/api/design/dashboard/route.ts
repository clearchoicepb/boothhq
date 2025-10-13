import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const designerId = searchParams.get('designer_id')
    const status = searchParams.get('status')

    const supabase = createServerSupabaseClient()

    // Build query
    let query = supabase
      .from('event_design_items')
      .select(`
        *,
        design_item_type:design_item_types(id, name, type),
        assigned_designer:users!event_design_items_assigned_designer_id_fkey(id, first_name, last_name, email),
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

    // Calculate stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const items = designItems || []

    // Categorize items
    const overdue = items.filter(item => {
      const deadline = new Date(item.design_deadline)
      deadline.setHours(0, 0, 0, 0)
      return deadline < today && item.status !== 'completed'
    })

    const urgent = items.filter(item => {
      const deadline = new Date(item.design_deadline)
      deadline.setHours(0, 0, 0, 0)
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil >= 0 && daysUntil <= 3 && item.status !== 'completed'
    })

    const dueThisWeek = items.filter(item => {
      const deadline = new Date(item.design_deadline)
      deadline.setHours(0, 0, 0, 0)
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > 3 && daysUntil <= 7 && item.status !== 'completed'
    })

    const upcoming = items.filter(item => {
      const deadline = new Date(item.design_deadline)
      deadline.setHours(0, 0, 0, 0)
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > 7 && daysUntil <= 14 && item.status !== 'completed'
    })

    const completed = items.filter(item => item.status === 'completed')

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
        overdue: overdue.length,
        urgent: urgent.length,
        dueThisWeek: dueThisWeek.length,
        upcoming: upcoming.length,
        completed: completed.length,
        recentCompletions: recentCompletions.length
      },
      categories: {
        overdue,
        urgent,
        dueThisWeek,
        upcoming,
        completed: recentCompletions.slice(0, 10)
      }
    })
  } catch (error: any) {
    console.error('Error fetching design dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
