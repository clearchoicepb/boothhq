import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:dashboard:stats')

export interface DashboardStatsResponse {
  eventsOccurring: {
    week: number
    month: number
    year: number
  }
  eventsBooked: {
    week: { count: number; revenue: number }
    month: { count: number; revenue: number }
    year: { count: number; revenue: number }
  }
  totalOpportunities: {
    count: number
    pipelineValue: number
  }
  newOpportunities: {
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
    const today = now.toISOString().split('T')[0]

    // Week range (Monday to Sunday)
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    const weekStartISO = weekStart.toISOString().split('T')[0]
    const weekEndISO = weekEnd.toISOString().split('T')[0]

    // Month range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthStartISO = monthStart.toISOString().split('T')[0]
    const monthEndISO = monthEnd.toISOString().split('T')[0]

    // Year range
    const yearStartISO = `${now.getFullYear()}-01-01`
    const yearEndISO = `${now.getFullYear()}-12-31`

    // Fetch all required data in parallel
    const [
      eventDatesResult,
      eventsResult,
      opportunitiesResult,
      invoicesResult
    ] = await Promise.all([
      // Event dates for "Events Occurring" - when events actually happen
      supabase
        .from('event_dates')
        .select('id, event_date, event_id')
        .eq('tenant_id', dataSourceTenantId),

      // Events for "Events Booked" - when events were created
      supabase
        .from('events')
        .select('id, created_at, opportunity_id')
        .eq('tenant_id', dataSourceTenantId),

      // Opportunities for pipeline stats
      supabase
        .from('opportunities')
        .select('id, stage, amount, created_at, is_converted')
        .eq('tenant_id', dataSourceTenantId),

      // Invoices linked to events for revenue calculation
      supabase
        .from('invoices')
        .select('id, event_id, opportunity_id, total_amount, created_at')
        .eq('tenant_id', dataSourceTenantId)
    ])

    // Handle errors
    if (eventDatesResult.error) {
      log.error({ error: eventDatesResult.error }, 'Failed to fetch event dates')
    }
    if (eventsResult.error) {
      log.error({ error: eventsResult.error }, 'Failed to fetch events')
    }
    if (opportunitiesResult.error) {
      log.error({ error: opportunitiesResult.error }, 'Failed to fetch opportunities')
    }
    if (invoicesResult.error) {
      log.error({ error: invoicesResult.error }, 'Failed to fetch invoices')
    }

    const eventDates = eventDatesResult.data || []
    const events = eventsResult.data || []
    const opportunities = opportunitiesResult.data || []
    const invoices = invoicesResult.data || []

    // Build event to invoice/opportunity amount map for revenue calculation
    const eventRevenueMap: Record<string, number> = {}

    // First, map invoice totals to events
    invoices.forEach(invoice => {
      if (invoice.event_id) {
        eventRevenueMap[invoice.event_id] = (eventRevenueMap[invoice.event_id] || 0) + (invoice.total_amount || 0)
      }
    })

    // For events without invoices, try to get amount from linked opportunity
    const eventToOpportunityMap: Record<string, string> = {}
    events.forEach(event => {
      if (event.opportunity_id) {
        eventToOpportunityMap[event.id] = event.opportunity_id
      }
    })

    const opportunityAmountMap: Record<string, number> = {}
    opportunities.forEach(opp => {
      opportunityAmountMap[opp.id] = opp.amount || 0
    })

    // Helper function to check if date is in range
    const isInRange = (dateStr: string | null, startISO: string, endISO: string): boolean => {
      if (!dateStr) return false
      const date = dateStr.split('T')[0]
      return date >= startISO && date <= endISO
    }

    // Calculate Events Occurring (by event_date field from event_dates table)
    const eventsOccurringWeek = eventDates.filter(ed => isInRange(ed.event_date, weekStartISO, weekEndISO)).length
    const eventsOccurringMonth = eventDates.filter(ed => isInRange(ed.event_date, monthStartISO, monthEndISO)).length
    const eventsOccurringYear = eventDates.filter(ed => isInRange(ed.event_date, yearStartISO, yearEndISO)).length

    // Calculate Events Booked (by created_at from events table) with revenue
    const getEventsBookedStats = (startISO: string, endISO: string) => {
      const bookedEvents = events.filter(e => isInRange(e.created_at, startISO, endISO))
      const count = bookedEvents.length

      // Calculate revenue from invoices linked to these events
      // If no invoice, fall back to opportunity amount
      let revenue = 0
      bookedEvents.forEach(event => {
        if (eventRevenueMap[event.id]) {
          revenue += eventRevenueMap[event.id]
        } else if (event.opportunity_id && opportunityAmountMap[event.opportunity_id]) {
          revenue += opportunityAmountMap[event.opportunity_id]
        }
      })

      return { count, revenue }
    }

    const eventsBookedWeek = getEventsBookedStats(weekStartISO, weekEndISO)
    const eventsBookedMonth = getEventsBookedStats(monthStartISO, monthEndISO)
    const eventsBookedYear = getEventsBookedStats(yearStartISO, yearEndISO)

    // Calculate Total Active Opportunities (not closed-won or closed-lost)
    const activeOpportunities = opportunities.filter(opp =>
      opp.stage !== 'closed_won' &&
      opp.stage !== 'closed_lost' &&
      !opp.is_converted
    )
    const totalOpportunitiesCount = activeOpportunities.length
    const totalPipelineValue = activeOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)

    // Calculate New Opportunities (by created_at)
    const getNewOpportunitiesStats = (startISO: string, endISO: string) => {
      const newOpps = opportunities.filter(opp => isInRange(opp.created_at, startISO, endISO))
      const count = newOpps.length
      const value = newOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0)
      return { count, value }
    }

    const newOpportunitiesWeek = getNewOpportunitiesStats(weekStartISO, weekEndISO)
    const newOpportunitiesMonth = getNewOpportunitiesStats(monthStartISO, monthEndISO)
    const newOpportunitiesYear = getNewOpportunitiesStats(yearStartISO, yearEndISO)

    const response: DashboardStatsResponse = {
      eventsOccurring: {
        week: eventsOccurringWeek,
        month: eventsOccurringMonth,
        year: eventsOccurringYear
      },
      eventsBooked: {
        week: eventsBookedWeek,
        month: eventsBookedMonth,
        year: eventsBookedYear
      },
      totalOpportunities: {
        count: totalOpportunitiesCount,
        pipelineValue: totalPipelineValue
      },
      newOpportunities: {
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
