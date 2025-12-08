import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { getDateRangeForPeriod, toDateInputValue, getTodayEST } from '@/lib/utils/date-utils'
import { CLOSED_STAGES, isOpenStage } from '@/lib/constants/opportunity-stages'

const log = createLogger('api:opportunities')

/**
 * GET /api/opportunities/stats
 *
 * Returns aggregated statistics for opportunities dashboard KPIs
 *
 * Query Parameters:
 * - stage: Filter by stage (optional, default: 'all')
 * - owner_id: Filter by owner (optional, default: 'all')
 * - period: Time period filter (optional, 'week' | 'month' | 'year' | 'all', default: 'all')
 *
 * Returns comprehensive stats for 8 KPI cards:
 * - newOpps: Count + value created in period
 * - openPipeline: Count + value of currently open (no time filter)
 * - won: Count + revenue closed in period
 * - lost: Count + value lost in period
 * - winRate: Percentage (won / (won + lost))
 * - avgDaysToClose: Average days from created_at to actual_close_date
 * - avgDealSize: Average value of won deals
 * - closingSoon: Count + value with expected_close_date in next 7 days
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const stageFilter = searchParams.get('stage') || 'all'
    const ownerFilter = searchParams.get('owner_id')
    const periodFilter = (searchParams.get('period') || 'all') as TimePeriod

    // Helper to apply common filters
    const applyCommonFilters = (query: any) => {
      if (stageFilter !== 'all') {
        query = query.eq('stage', stageFilter)
      }
      if (ownerFilter && ownerFilter !== 'all') {
        if (ownerFilter === 'unassigned') {
          query = query.is('owner_id', null)
        } else {
          query = query.eq('owner_id', ownerFilter)
        }
      }
      return query
    }

    // Calculate date ranges using EST timezone for consistency
    const today = getTodayEST()
    const todayISO = toDateInputValue(today)
    const next7Days = new Date(today)
    next7Days.setDate(next7Days.getDate() + 7)
    const next7DaysISO = toDateInputValue(next7Days)

    // Query 1: Time-filtered opportunities (for New Opps created in period)
    let timeFilteredQuery = supabase
      .from('opportunities')
      .select('id, amount, probability, stage, created_at, actual_close_date')
      .eq('tenant_id', dataSourceTenantId)

    timeFilteredQuery = applyCommonFilters(timeFilteredQuery)

    if (periodFilter !== 'all') {
      const dateRange = getDateRangeForPeriod(periodFilter)
      timeFilteredQuery = timeFilteredQuery
        .gte('created_at', dateRange.startISO)
        .lte('created_at', dateRange.endISO + 'T23:59:59')
    }

    // Query 2: Open Pipeline (no time filter - current state)
    // Use NOT IN closed stages to support tenant-configurable open stages
    const closedStagesFilter = `(${CLOSED_STAGES.join(',')})`
    let openPipelineQuery = supabase
      .from('opportunities')
      .select('id, amount, probability, stage')
      .eq('tenant_id', dataSourceTenantId)
      .not('stage', 'in', closedStagesFilter)

    // Only apply owner filter to open pipeline, not stage filter
    if (ownerFilter && ownerFilter !== 'all') {
      if (ownerFilter === 'unassigned') {
        openPipelineQuery = openPipelineQuery.is('owner_id', null)
      } else {
        openPipelineQuery = openPipelineQuery.eq('owner_id', ownerFilter)
      }
    }

    // Query 3: Closing Soon (next 7 days, open opportunities only)
    let closingSoonQuery = supabase
      .from('opportunities')
      .select('id, amount, probability, stage, expected_close_date')
      .eq('tenant_id', dataSourceTenantId)
      .not('stage', 'in', closedStagesFilter)
      .gte('expected_close_date', todayISO)
      .lte('expected_close_date', next7DaysISO)

    if (ownerFilter && ownerFilter !== 'all') {
      if (ownerFilter === 'unassigned') {
        closingSoonQuery = closingSoonQuery.is('owner_id', null)
      } else {
        closingSoonQuery = closingSoonQuery.eq('owner_id', ownerFilter)
      }
    }

    // Query 4: Won/Lost in period (filter by actual_close_date for accurate period attribution)
    // Using actual_close_date ensures opportunities are counted in the period they were actually closed,
    // not when they were last updated (which could be a later edit)
    let closedInPeriodQuery = supabase
      .from('opportunities')
      .select('id, amount, probability, stage, created_at, actual_close_date')
      .eq('tenant_id', dataSourceTenantId)
      .in('stage', ['closed_won', 'closed_lost'])

    if (ownerFilter && ownerFilter !== 'all') {
      if (ownerFilter === 'unassigned') {
        closedInPeriodQuery = closedInPeriodQuery.is('owner_id', null)
      } else {
        closedInPeriodQuery = closedInPeriodQuery.eq('owner_id', ownerFilter)
      }
    }

    if (periodFilter !== 'all') {
      const dateRange = getDateRangeForPeriod(periodFilter)
      // Filter by actual_close_date to match drilldown API behavior
      closedInPeriodQuery = closedInPeriodQuery
        .gte('actual_close_date', dateRange.startISO)
        .lte('actual_close_date', dateRange.endISO)
    }

    // Execute all queries in parallel
    const [
      timeFilteredResult,
      openPipelineResult,
      closingSoonResult,
      closedInPeriodResult
    ] = await Promise.all([
      timeFilteredQuery,
      openPipelineQuery,
      closingSoonQuery,
      closedInPeriodQuery
    ])

    if (timeFilteredResult.error) {
      log.error({ error: timeFilteredResult.error }, 'Error fetching time-filtered opportunities')
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const timeFilteredOpps = timeFilteredResult.data || []
    const openPipelineOpps = openPipelineResult.data || []
    const closingSoonOpps = closingSoonResult.data || []
    const closedInPeriodOpps = closedInPeriodResult.data || []

    // Calculate New Opps (created in period)
    const newOppsCount = timeFilteredOpps.length
    const newOppsValue = timeFilteredOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    const newOppsWeightedValue = timeFilteredOpps.reduce((sum, opp) => {
      const amount = opp.amount || 0
      const probability = opp.probability || 0
      return sum + (amount * probability / 100)
    }, 0)

    // Calculate Open Pipeline (current state, no time filter)
    const openPipelineCount = openPipelineOpps.length
    const openPipelineValue = openPipelineOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    const openPipelineWeightedValue = openPipelineOpps.reduce((sum, opp) => {
      const amount = opp.amount || 0
      const probability = opp.probability || 0
      return sum + (amount * probability / 100)
    }, 0)

    // Calculate Won/Lost in period (by actual_close_date)
    const wonInPeriod = closedInPeriodOpps.filter(opp => opp.stage === 'closed_won')
    const lostInPeriod = closedInPeriodOpps.filter(opp => opp.stage === 'closed_lost')

    const wonCount = wonInPeriod.length
    const wonValue = wonInPeriod.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    const lostCount = lostInPeriod.length
    const lostValue = lostInPeriod.reduce((sum, opp) => sum + (opp.amount || 0), 0)

    // Calculate Win Rate
    const totalClosed = wonCount + lostCount
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : null

    // Calculate Avg Days to Close (for won opps with actual_close_date)
    const wonWithCloseDates = wonInPeriod.filter(opp => opp.actual_close_date && opp.created_at)
    let avgDaysToClose: number | null = null
    if (wonWithCloseDates.length > 0) {
      const totalDays = wonWithCloseDates.reduce((sum, opp) => {
        const created = new Date(opp.created_at)
        const closed = new Date(opp.actual_close_date)
        const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return sum + Math.max(0, days)
      }, 0)
      avgDaysToClose = Math.round(totalDays / wonWithCloseDates.length)
    }

    // Calculate Avg Deal Size (for won opps)
    const avgDealSize = wonCount > 0 ? Math.round(wonValue / wonCount) : null

    // Calculate Closing Soon (next 7 days)
    const closingSoonCount = closingSoonOpps.length
    const closingSoonValue = closingSoonOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    const closingSoonWeightedValue = closingSoonOpps.reduce((sum, opp) => {
      const amount = opp.amount || 0
      const probability = opp.probability || 0
      return sum + (amount * probability / 100)
    }, 0)

    // Legacy stats for backwards compatibility
    const total = timeFilteredOpps.length
    const totalValue = newOppsValue
    const expectedValue = newOppsWeightedValue
    const openCount = timeFilteredOpps.filter(opp => isOpenStage(opp.stage)).length
    const closedWonCount = timeFilteredOpps.filter(opp => opp.stage === 'closed_won').length
    const closedWonValue = timeFilteredOpps.filter(opp => opp.stage === 'closed_won')
      .reduce((sum, opp) => sum + (opp.amount || 0), 0)
    const closedLostCount = timeFilteredOpps.filter(opp => opp.stage === 'closed_lost').length

    const stats = {
      // Legacy fields (backwards compatibility)
      total,
      openCount,
      totalValue,
      expectedValue,
      closedWonCount,
      closedWonValue,
      closedLostCount,
      averageValue: total > 0 ? totalValue / total : 0,
      averageProbability: total > 0
        ? timeFilteredOpps.reduce((sum, opp) => sum + (opp.probability || 0), 0) / total
        : 0,

      // New KPI fields
      newOpps: {
        count: newOppsCount,
        value: newOppsValue,
        weightedValue: newOppsWeightedValue
      },
      openPipeline: {
        count: openPipelineCount,
        value: openPipelineValue,
        weightedValue: openPipelineWeightedValue
      },
      won: {
        count: wonCount,
        value: wonValue
      },
      lost: {
        count: lostCount,
        value: lostValue
      },
      winRate,
      avgDaysToClose,
      avgDealSize,
      closingSoon: {
        count: closingSoonCount,
        value: closingSoonValue,
        weightedValue: closingSoonWeightedValue
      }
    }

    const response = NextResponse.json(stats)

    // Cache for 30 seconds (balance between performance and freshness)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return response
  } catch (error) {
    log.error({ error }, 'Error in opportunities stats API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
