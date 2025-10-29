import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

/**
 * GET /api/events/stats
 * 
 * Returns aggregated statistics for all events (not just current page)
 * Calculates: Total Events, Upcoming Events, Events This Week
 * 
 * Query Parameters:
 * - status: Filter by status (optional)
 * - event_type: Filter by type (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const eventTypeFilter = searchParams.get('event_type')

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Build query with filters
    let query = supabase
      .from('events')
      .select('id, status, start_date, end_date, event_type')
      .eq('tenant_id', session.user.tenantId)

    // Apply filters
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    
    if (eventTypeFilter && eventTypeFilter !== 'all') {
      query = query.eq('event_type', eventTypeFilter)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events for stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Calculate statistics
    const totalEvents = events?.length || 0
    
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    todayStart.setHours(0, 0, 0, 0)
    
    // This week = today + next 6 days (7 days total)
    const weekEnd = new Date(todayStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    // Upcoming = all events from today forward
    const upcomingEvents = events?.filter(e => {
      const startDate = new Date(e.start_date)
      return startDate >= todayStart
    }).length || 0

    // This Week = today through next 6 days
    const thisWeekEvents = events?.filter(e => {
      const startDate = new Date(e.start_date)
      return startDate >= todayStart && startDate <= weekEnd
    }).length || 0

    // Additional stats by status
    const scheduledEvents = events?.filter(e => e.status === 'scheduled').length || 0
    const confirmedEvents = events?.filter(e => e.status === 'confirmed').length || 0
    const completedEvents = events?.filter(e => e.status === 'completed').length || 0

    const stats = {
      totalEvents,
      upcomingEvents,
      thisWeekEvents,
      scheduledEvents,
      confirmedEvents,
      completedEvents
    }

    const response = NextResponse.json(stats)
    
    // Cache for 30 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    
    return response
  } catch (error) {
    console.error('Error in events stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

