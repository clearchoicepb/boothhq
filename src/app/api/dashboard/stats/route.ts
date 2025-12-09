/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:dashboard:stats')

export interface DashboardStatsResponse {
  eventsOccurring: {
    today: number
    week: number
    month: number
    year: number
  }
  eventsBooked: {
    today: { count: number; revenue: number }
    week: { count: number; revenue: number }
    month: { count: number; revenue: number }
    year: { count: number; revenue: number }
  }
  totalOpportunities: {
    count: number
    pipelineValue: number
  }
  newOpportunities: {
    today: { count: number; value: number }
    week: { count: number; value: number }
    month: { count: number; value: number }
    year: { count: number; value: number }
  }
}

/**
 * GET /api/dashboard/stats
 * Returns KPI statistics for the tenant dashboard
 */
export async function GET(_request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Get date ranges
    const now = new Date()

    // Helper to format date as YYYY-MM-DD in local time (not UTC)
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Today range (local date)
    const todayISO = formatLocalDate(now)

    // Week range (Monday to Sunday)
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const weekStartISO = formatLocalDate(weekStart)
    const weekEndISO = formatLocalDate(weekEnd)

    // Month range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthStartISO = formatLocalDate(monthStart)
    const monthEndISO = formatLocalDate(monthEnd)

    // Year range
    const yearStartISO = `${now.getFullYear()}-01-01`
    const yearEndISO = `${now.getFullYear()}-12-31`

    // =====================================================
    // EVENTS OCCURRING - Count event_dates with linked events
    // Uses inner join with events table (events!inner)
    // =====================================================
    const [
      eventsOccurringTodayResult,
      eventsOccurringWeekResult,
      eventsOccurringMonthResult,
      eventsOccurringYearResult
    ] = await Promise.all([
      supabase
        .from('event_dates')
        .select('id, events!inner(id)', { count: 'exact', head: true })
        .eq('tenant_id', dataSourceTenantId)
        .eq('event_date', todayISO),
      supabase
        .from('event_dates')
        .select('id, events!inner(id)', { count: 'exact', head: true })
        .eq('tenant_id', dataSourceTenantId)
        .gte('event_date', weekStartISO)
        .lte('event_date', weekEndISO),
      supabase
        .from('event_dates')
        .select('id, events!inner(id)', { count: 'exact', head: true })
        .eq('tenant_id', dataSourceTenantId)
        .gte('event_date', monthStartISO)
        .lte('event_date', monthEndISO),
      supabase
        .from('event_dates')
        .select('id, events!inner(id)', { count: 'exact', head: true })
        .eq('tenant_id', dataSourceTenantId)
        .gte('event_date', yearStartISO)
        .lte('event_date', yearEndISO)
    ])

    const eventsOccurringToday = eventsOccurringTodayResult.count || 0
    const eventsOccurringWeek = eventsOccurringWeekResult.count || 0
    const eventsOccurringMonth = eventsOccurringMonthResult.count || 0
    const eventsOccurringYear = eventsOccurringYearResult.count || 0

    // =====================================================
    // EVENTS BOOKED - Count events by created_at with revenue
    // =====================================================
    const [
      eventsBookedTodayResult,
      eventsBookedWeekResult,
      eventsBookedMonthResult,
      eventsBookedYearResult
    ] = await Promise.all([
      supabase
        .from('events')
        .select('id, opportunity_id')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${todayISO}T00:00:00`)
        .lte('created_at', `${todayISO}T23:59:59`),
      supabase
        .from('events')
        .select('id, opportunity_id')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${weekStartISO}T00:00:00`)
        .lte('created_at', `${weekEndISO}T23:59:59`),
      supabase
        .from('events')
        .select('id, opportunity_id')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${monthStartISO}T00:00:00`)
        .lte('created_at', `${monthEndISO}T23:59:59`),
      supabase
        .from('events')
        .select('id, opportunity_id')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${yearStartISO}T00:00:00`)
        .lte('created_at', `${yearEndISO}T23:59:59`)
    ])

    // Get all invoices and opportunities for revenue calculation
    const allEventIds = [
      ...(eventsBookedTodayResult.data || []),
      ...(eventsBookedWeekResult.data || []),
      ...(eventsBookedMonthResult.data || []),
      ...(eventsBookedYearResult.data || [])
    ].map(e => e.id)

    const allOpportunityIds = [
      ...(eventsBookedTodayResult.data || []),
      ...(eventsBookedWeekResult.data || []),
      ...(eventsBookedMonthResult.data || []),
      ...(eventsBookedYearResult.data || [])
    ].map(e => e.opportunity_id).filter(Boolean)

    const invoicesByEvent: Record<string, number> = {}
    const opportunityAmounts: Record<string, number> = {}

    if (allEventIds.length > 0) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('event_id, total_amount')
        .eq('tenant_id', dataSourceTenantId)
        .in('event_id', allEventIds)

      if (invoices) {
        invoices.forEach((inv: any) => {
          if (inv.event_id) {
            invoicesByEvent[inv.event_id] = (invoicesByEvent[inv.event_id] || 0) + (inv.total_amount || 0)
          }
        })
      }
    }

    if (allOpportunityIds.length > 0) {
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('id, amount')
        .in('id', allOpportunityIds)

      if (opportunities) {
        opportunities.forEach((opp: any) => {
          opportunityAmounts[opp.id] = opp.amount || 0
        })
      }
    }

    // Calculate revenue for each period
    const calculateRevenue = (events: any[]) => {
      let revenue = 0
      events.forEach(event => {
        if (invoicesByEvent[event.id]) {
          revenue += invoicesByEvent[event.id]
        } else if (event.opportunity_id && opportunityAmounts[event.opportunity_id]) {
          revenue += opportunityAmounts[event.opportunity_id]
        }
      })
      return revenue
    }

    const eventsBookedToday = {
      count: eventsBookedTodayResult.data?.length || 0,
      revenue: calculateRevenue(eventsBookedTodayResult.data || [])
    }
    const eventsBookedWeek = {
      count: eventsBookedWeekResult.data?.length || 0,
      revenue: calculateRevenue(eventsBookedWeekResult.data || [])
    }
    const eventsBookedMonth = {
      count: eventsBookedMonthResult.data?.length || 0,
      revenue: calculateRevenue(eventsBookedMonthResult.data || [])
    }
    const eventsBookedYear = {
      count: eventsBookedYearResult.data?.length || 0,
      revenue: calculateRevenue(eventsBookedYearResult.data || [])
    }

    // =====================================================
    // TOTAL OPPORTUNITIES - Active pipeline
    // =====================================================
    const { data: activeOpportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('id, amount')
      .eq('tenant_id', dataSourceTenantId)
      .not('stage', 'in', '("closed_won","closed_lost")')
      .eq('is_converted', false)

    if (oppError) {
      log.error({ error: oppError }, 'Failed to fetch active opportunities')
    }

    const totalOpportunitiesCount = activeOpportunities?.length || 0
    const totalPipelineValue = (activeOpportunities || []).reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)

    // =====================================================
    // NEW OPPORTUNITIES - By created_at
    // =====================================================
    const [
      newOppsTodayResult,
      newOppsWeekResult,
      newOppsMonthResult,
      newOppsYearResult
    ] = await Promise.all([
      supabase
        .from('opportunities')
        .select('id, amount')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${todayISO}T00:00:00`)
        .lte('created_at', `${todayISO}T23:59:59`),
      supabase
        .from('opportunities')
        .select('id, amount')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${weekStartISO}T00:00:00`)
        .lte('created_at', `${weekEndISO}T23:59:59`),
      supabase
        .from('opportunities')
        .select('id, amount')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${monthStartISO}T00:00:00`)
        .lte('created_at', `${monthEndISO}T23:59:59`),
      supabase
        .from('opportunities')
        .select('id, amount')
        .eq('tenant_id', dataSourceTenantId)
        .gte('created_at', `${yearStartISO}T00:00:00`)
        .lte('created_at', `${yearEndISO}T23:59:59`)
    ])

    const newOpportunitiesToday = {
      count: newOppsTodayResult.data?.length || 0,
      value: (newOppsTodayResult.data || []).reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesWeek = {
      count: newOppsWeekResult.data?.length || 0,
      value: (newOppsWeekResult.data || []).reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesMonth = {
      count: newOppsMonthResult.data?.length || 0,
      value: (newOppsMonthResult.data || []).reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesYear = {
      count: newOppsYearResult.data?.length || 0,
      value: (newOppsYearResult.data || []).reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)
    }

    const response: DashboardStatsResponse = {
      eventsOccurring: {
        today: eventsOccurringToday,
        week: eventsOccurringWeek,
        month: eventsOccurringMonth,
        year: eventsOccurringYear
      },
      eventsBooked: {
        today: eventsBookedToday,
        week: eventsBookedWeek,
        month: eventsBookedMonth,
        year: eventsBookedYear
      },
      totalOpportunities: {
        count: totalOpportunitiesCount,
        pipelineValue: totalPipelineValue
      },
      newOpportunities: {
        today: newOpportunitiesToday,
        week: newOpportunitiesWeek,
        month: newOpportunitiesMonth,
        year: newOpportunitiesYear
      }
    }

    log.debug({ response }, 'Dashboard stats calculated')

    const jsonResponse = NextResponse.json(response)
    jsonResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return jsonResponse
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/dashboard/stats')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
