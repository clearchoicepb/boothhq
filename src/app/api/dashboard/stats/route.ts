import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { Tables } from '@/types/database'

const log = createLogger('api:dashboard:stats')

// Query result types for Supabase queries
type EventBookedQueryResult = Pick<Tables<'events'>, 'id' | 'opportunity_id'>
type InvoiceAmountQueryResult = Pick<Tables<'invoices'>, 'event_id' | 'total_amount'>
type OpportunityAmountQueryResult = Pick<Tables<'opportunities'>, 'id' | 'amount'>

export interface DashboardStatsResponse {
  eventsOccurring: {
    today: number
    yesterday: number
    week: number
    month: number
    year: number
  }
  eventsBooked: {
    today: { count: number; revenue: number }
    yesterday: { count: number; revenue: number }
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
    yesterday: { count: number; value: number }
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

    // Get date ranges using EST timezone (America/New_York) consistently
    // This ensures dates match what users see regardless of server timezone
    const EST_TIMEZONE = 'America/New_York'

    const getESTDateParts = (): { year: number; month: number; day: number; dayOfWeek: number } => {
      const now = new Date()
      const estString = now.toLocaleString('en-US', {
        timeZone: EST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      })
      // Parse "Mon, MM/DD/YYYY" or "MM/DD/YYYY" format
      const dateMatch = estString.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      const dayMatch = estString.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/)

      const dayOfWeekMap: Record<string, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      }

      if (dateMatch) {
        return {
          month: parseInt(dateMatch[1]),
          day: parseInt(dateMatch[2]),
          year: parseInt(dateMatch[3]),
          dayOfWeek: dayMatch ? dayOfWeekMap[dayMatch[1]] : now.getDay()
        }
      }
      // Fallback
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        dayOfWeek: now.getDay()
      }
    }

    const estParts = getESTDateParts()

    // Helper to format date as YYYY-MM-DD
    const formatDate = (year: number, month: number, day: number): string => {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    // Today range (EST date)
    const todayISO = formatDate(estParts.year, estParts.month, estParts.day)

    // Yesterday range (EST date)
    const yesterdayDate = new Date(estParts.year, estParts.month - 1, estParts.day - 1)
    const yesterdayISO = formatDate(yesterdayDate.getFullYear(), yesterdayDate.getMonth() + 1, yesterdayDate.getDate())

    // Week range (Monday to Sunday) - calculate in EST
    const daysToMonday = estParts.dayOfWeek === 0 ? 6 : estParts.dayOfWeek - 1
    const weekStartDate = new Date(estParts.year, estParts.month - 1, estParts.day - daysToMonday)
    const weekEndDate = new Date(estParts.year, estParts.month - 1, estParts.day - daysToMonday + 6)
    const weekStartISO = formatDate(weekStartDate.getFullYear(), weekStartDate.getMonth() + 1, weekStartDate.getDate())
    const weekEndISO = formatDate(weekEndDate.getFullYear(), weekEndDate.getMonth() + 1, weekEndDate.getDate())

    // Month range
    const monthStartISO = formatDate(estParts.year, estParts.month, 1)
    const monthEnd = new Date(estParts.year, estParts.month, 0) // Last day of current month
    const monthEndISO = formatDate(monthEnd.getFullYear(), monthEnd.getMonth() + 1, monthEnd.getDate())

    // Year range
    const yearStartISO = `${estParts.year}-01-01`
    const yearEndISO = `${estParts.year}-12-31`

    // =====================================================
    // EVENTS OCCURRING - Count event_dates with linked events
    // Uses inner join with events table (events!inner)
    // =====================================================
    const [
      eventsOccurringTodayResult,
      eventsOccurringYesterdayResult,
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
        .eq('event_date', yesterdayISO),
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
    const eventsOccurringYesterday = eventsOccurringYesterdayResult.count || 0
    const eventsOccurringWeek = eventsOccurringWeekResult.count || 0
    const eventsOccurringMonth = eventsOccurringMonthResult.count || 0
    const eventsOccurringYear = eventsOccurringYearResult.count || 0

    // =====================================================
    // EVENTS BOOKED - Count events by created_at with revenue
    // =====================================================
    const [
      eventsBookedTodayResult,
      eventsBookedYesterdayResult,
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
        .gte('created_at', `${yesterdayISO}T00:00:00`)
        .lte('created_at', `${yesterdayISO}T23:59:59`),
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
      ...(eventsBookedYesterdayResult.data || []),
      ...(eventsBookedWeekResult.data || []),
      ...(eventsBookedMonthResult.data || []),
      ...(eventsBookedYearResult.data || [])
    ].map(e => e.id)

    const allOpportunityIds = [
      ...(eventsBookedTodayResult.data || []),
      ...(eventsBookedYesterdayResult.data || []),
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
        (invoices as InvoiceAmountQueryResult[]).forEach((inv) => {
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
        (opportunities as OpportunityAmountQueryResult[]).forEach((opp) => {
          opportunityAmounts[opp.id] = opp.amount || 0
        })
      }
    }

    // Calculate revenue for each period
    const calculateRevenue = (events: EventBookedQueryResult[]) => {
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
    const eventsBookedYesterday = {
      count: eventsBookedYesterdayResult.data?.length || 0,
      revenue: calculateRevenue(eventsBookedYesterdayResult.data || [])
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
    const totalPipelineValue = ((activeOpportunities || []) as OpportunityAmountQueryResult[]).reduce((sum, opp) => sum + (opp.amount || 0), 0)

    // =====================================================
    // NEW OPPORTUNITIES - By created_at
    // =====================================================
    const [
      newOppsTodayResult,
      newOppsYesterdayResult,
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
        .gte('created_at', `${yesterdayISO}T00:00:00`)
        .lte('created_at', `${yesterdayISO}T23:59:59`),
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
      value: ((newOppsTodayResult.data || []) as OpportunityAmountQueryResult[]).reduce((sum, opp) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesYesterday = {
      count: newOppsYesterdayResult.data?.length || 0,
      value: ((newOppsYesterdayResult.data || []) as OpportunityAmountQueryResult[]).reduce((sum, opp) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesWeek = {
      count: newOppsWeekResult.data?.length || 0,
      value: ((newOppsWeekResult.data || []) as OpportunityAmountQueryResult[]).reduce((sum, opp) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesMonth = {
      count: newOppsMonthResult.data?.length || 0,
      value: ((newOppsMonthResult.data || []) as OpportunityAmountQueryResult[]).reduce((sum, opp) => sum + (opp.amount || 0), 0)
    }
    const newOpportunitiesYear = {
      count: newOppsYearResult.data?.length || 0,
      value: ((newOppsYearResult.data || []) as OpportunityAmountQueryResult[]).reduce((sum, opp) => sum + (opp.amount || 0), 0)
    }

    const response: DashboardStatsResponse = {
      eventsOccurring: {
        today: eventsOccurringToday,
        yesterday: eventsOccurringYesterday,
        week: eventsOccurringWeek,
        month: eventsOccurringMonth,
        year: eventsOccurringYear
      },
      eventsBooked: {
        today: eventsBookedToday,
        yesterday: eventsBookedYesterday,
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
        yesterday: newOpportunitiesYesterday,
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
