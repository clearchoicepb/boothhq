/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import { getDateRangeForPeriod } from '@/lib/utils/date-utils'
import type { TimePeriod } from '@/components/ui/kpi-card'

const log = createLogger('api:opportunities:drilldown')

export type OpportunityDrilldownType =
  | 'new-opps'
  | 'open-pipeline'
  | 'won'
  | 'lost'
  | 'win-rate'
  | 'avg-days'
  | 'avg-deal'
  | 'closing-soon'

export interface OpportunityDrilldownRecord {
  id: string
  name: string
  createdAt: string
  accountName: string | null
  eventDate: string | null
  amount: number
  probability: number
  weightedValue: number
  stage: string
  stageName: string
  actualCloseDate: string | null
  expectedCloseDate: string | null
  closeReason: string | null
  daysToClose: number | null
  daysUntilClose: number | null
  result?: 'won' | 'lost'
}

interface StageConfig {
  id: string
  name: string
  probability: number
  color?: string
  enabled: boolean
}

const defaultStages: StageConfig[] = [
  { id: 'prospecting', name: 'Prospecting', probability: 10, enabled: true },
  { id: 'qualification', name: 'Qualification', probability: 25, enabled: true },
  { id: 'proposal', name: 'Proposal', probability: 50, enabled: true },
  { id: 'negotiation', name: 'Negotiation', probability: 75, enabled: true },
  { id: 'closed_won', name: 'Closed Won', probability: 100, enabled: true },
  { id: 'closed_lost', name: 'Closed Lost', probability: 0, enabled: true }
]

const OPEN_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation']

function getStageName(stageId: string, stages: StageConfig[]): string {
  const stage = stages.find(s => s.id === stageId)
  if (stage?.name) return stage.name
  return stageId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function getStageProbability(stageId: string, stages: StageConfig[]): number {
  const stage = stages.find(s => s.id === stageId)
  return stage?.probability ?? 0
}

export interface OpportunityDrilldownResponse {
  type: OpportunityDrilldownType
  period: TimePeriod | null
  periodLabel: string
  records: OpportunityDrilldownRecord[]
  totalCount: number
  totalValue: number
  totalWeightedValue: number
  wonCount?: number
  lostCount?: number
  winRate?: number
  avgDaysToClose?: number
  avgDealSize?: number
}

async function getStages(supabase: any, dataSourceTenantId: string): Promise<StageConfig[]> {
  const { data: stageSettings } = await supabase
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', dataSourceTenantId)
    .like('setting_key', 'opportunities.stages%')

  let stages: StageConfig[] = defaultStages
  if (stageSettings && stageSettings.length > 0) {
    try {
      const arrayFormat = stageSettings.find((row: any) => row.setting_key === 'opportunities.stages')
      if (arrayFormat?.setting_value) {
        let parsedStages = arrayFormat.setting_value
        if (typeof parsedStages === 'string') {
          parsedStages = JSON.parse(parsedStages)
        }
        if (Array.isArray(parsedStages) && parsedStages.length > 0) {
          stages = parsedStages.filter((s: any) => s.enabled !== false)
        }
      }
    } catch (e) {
      log.warn({ error: e }, 'Failed to parse stage settings, using defaults')
    }
  }
  return stages
}

function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case 'week': return 'This Week'
    case 'month': return 'This Month'
    case 'year': return 'This Year'
    case 'all': return 'All Time'
    default: return 'This Month'
  }
}

/**
 * GET /api/opportunities/drilldown
 * Returns detailed records for opportunities KPI drilldowns
 *
 * Query params:
 * - type: OpportunityDrilldownType (required)
 * - period: TimePeriod (optional, default 'month')
 * - valueMode: 'total' | 'weighted' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type') as OpportunityDrilldownType
    const period = (searchParams.get('period') as TimePeriod) || 'month'

    if (!type) {
      return NextResponse.json({ error: 'type parameter is required' }, { status: 400 })
    }

    const stages = await getStages(supabase, dataSourceTenantId)
    const periodLabel = getPeriodLabel(period)

    // Get date range for period
    const dateRange = getDateRangeForPeriod(period)
    const startISO = dateRange.start.toISOString().split('T')[0]
    const endISO = dateRange.end.toISOString().split('T')[0]

    // For closing soon, get next 7 days
    const now = new Date()
    const closingSoonEnd = new Date(now)
    closingSoonEnd.setDate(now.getDate() + 7)
    const todayISO = now.toISOString().split('T')[0]
    const closingSoonEndISO = closingSoonEnd.toISOString().split('T')[0]

    let response: OpportunityDrilldownResponse

    switch (type) {
      case 'new-opps': {
        // Opportunities created in period
        let query = supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, stage, probability, expected_close_date,
            accounts(name),
            event_dates(event_date)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .order('created_at', { ascending: false })

        if (period !== 'all') {
          query = query
            .gte('created_at', `${startISO}T00:00:00`)
            .lte('created_at', `${endISO}T23:59:59`)
        }

        const { data: opportunities, error } = await query

        if (error) {
          log.error({ error }, 'Failed to fetch new opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const probability = opp.probability ?? getStageProbability(opp.stage, stages)
          const value = opp.amount || 0
          const eventDates = opp.event_dates || []
          const earliestEventDate = eventDates.length > 0
            ? eventDates.map((ed: any) => ed.event_date).filter(Boolean).sort()[0]
            : null

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: earliestEventDate,
            amount: value,
            probability,
            weightedValue: value * (probability / 100),
            stage: opp.stage,
            stageName: getStageName(opp.stage, stages),
            actualCloseDate: null,
            expectedCloseDate: opp.expected_close_date,
            closeReason: null,
            daysToClose: null,
            daysUntilClose: null
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)
        const totalWeightedValue = records.reduce((sum, r) => sum + r.weightedValue, 0)

        response = {
          type,
          period,
          periodLabel: `New Opportunities - ${periodLabel}`,
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue
        }
        break
      }

      case 'open-pipeline': {
        // Open opportunities (current state, no period filter)
        const { data: opportunities, error } = await supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, stage, probability, expected_close_date,
            accounts(name),
            event_dates(event_date)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .in('stage', OPEN_STAGES)
          .order('amount', { ascending: false, nullsFirst: false })

        if (error) {
          log.error({ error }, 'Failed to fetch open pipeline')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const probability = opp.probability ?? getStageProbability(opp.stage, stages)
          const value = opp.amount || 0
          const eventDates = opp.event_dates || []
          const earliestEventDate = eventDates.length > 0
            ? eventDates.map((ed: any) => ed.event_date).filter(Boolean).sort()[0]
            : null

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: earliestEventDate,
            amount: value,
            probability,
            weightedValue: value * (probability / 100),
            stage: opp.stage,
            stageName: getStageName(opp.stage, stages),
            actualCloseDate: null,
            expectedCloseDate: opp.expected_close_date,
            closeReason: null,
            daysToClose: null,
            daysUntilClose: null
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)
        const totalWeightedValue = records.reduce((sum, r) => sum + r.weightedValue, 0)

        response = {
          type,
          period: null,
          periodLabel: 'Open Pipeline',
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue
        }
        break
      }

      case 'won': {
        // Won opportunities in period (by actual_close_date)
        let query = supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, stage, probability, actual_close_date, expected_close_date,
            accounts(name),
            event_dates(event_date)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .eq('stage', 'closed_won')
          .order('actual_close_date', { ascending: false })

        if (period !== 'all') {
          query = query
            .gte('actual_close_date', startISO)
            .lte('actual_close_date', endISO)
        }

        const { data: opportunities, error } = await query

        if (error) {
          log.error({ error }, 'Failed to fetch won opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const value = opp.amount || 0
          const eventDates = opp.event_dates || []
          const earliestEventDate = eventDates.length > 0
            ? eventDates.map((ed: any) => ed.event_date).filter(Boolean).sort()[0]
            : null

          // Calculate days to close
          let daysToClose: number | null = null
          if (opp.actual_close_date && opp.created_at) {
            const created = new Date(opp.created_at)
            const closed = new Date(opp.actual_close_date)
            daysToClose = Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          }

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: earliestEventDate,
            amount: value,
            probability: 100,
            weightedValue: value,
            stage: 'closed_won',
            stageName: 'Closed Won',
            actualCloseDate: opp.actual_close_date,
            expectedCloseDate: opp.expected_close_date,
            closeReason: null,
            daysToClose,
            daysUntilClose: null
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)

        response = {
          type,
          period,
          periodLabel: `Won Opportunities - ${periodLabel}`,
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue: totalValue
        }
        break
      }

      case 'lost': {
        // Lost opportunities in period (by actual_close_date)
        let query = supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, stage, probability, actual_close_date, close_reason,
            accounts(name),
            event_dates(event_date)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .eq('stage', 'closed_lost')
          .order('actual_close_date', { ascending: false })

        if (period !== 'all') {
          query = query
            .gte('actual_close_date', startISO)
            .lte('actual_close_date', endISO)
        }

        const { data: opportunities, error } = await query

        if (error) {
          log.error({ error }, 'Failed to fetch lost opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const value = opp.amount || 0
          const eventDates = opp.event_dates || []
          const earliestEventDate = eventDates.length > 0
            ? eventDates.map((ed: any) => ed.event_date).filter(Boolean).sort()[0]
            : null

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: earliestEventDate,
            amount: value,
            probability: 0,
            weightedValue: 0,
            stage: 'closed_lost',
            stageName: 'Closed Lost',
            actualCloseDate: opp.actual_close_date,
            expectedCloseDate: null,
            closeReason: opp.close_reason || null,
            daysToClose: null,
            daysUntilClose: null
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)

        response = {
          type,
          period,
          periodLabel: `Lost Opportunities - ${periodLabel}`,
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue: 0
        }
        break
      }

      case 'win-rate': {
        // All closed opportunities in period (won + lost)
        let query = supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, stage, actual_close_date,
            accounts(name)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .in('stage', ['closed_won', 'closed_lost'])
          .order('actual_close_date', { ascending: false })

        if (period !== 'all') {
          query = query
            .gte('actual_close_date', startISO)
            .lte('actual_close_date', endISO)
        }

        const { data: opportunities, error } = await query

        if (error) {
          log.error({ error }, 'Failed to fetch closed opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const value = opp.amount || 0
          const isWon = opp.stage === 'closed_won'

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: null,
            amount: value,
            probability: isWon ? 100 : 0,
            weightedValue: isWon ? value : 0,
            stage: opp.stage,
            stageName: isWon ? 'Closed Won' : 'Closed Lost',
            actualCloseDate: opp.actual_close_date,
            expectedCloseDate: null,
            closeReason: null,
            daysToClose: null,
            daysUntilClose: null,
            result: isWon ? 'won' : 'lost'
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)
        const wonCount = records.filter(r => r.result === 'won').length
        const lostCount = records.filter(r => r.result === 'lost').length
        const winRate = records.length > 0 ? Math.round((wonCount / records.length) * 100) : null

        response = {
          type,
          period,
          periodLabel: `Closed Opportunities - ${periodLabel}`,
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue: records.filter(r => r.result === 'won').reduce((sum, r) => sum + r.amount, 0),
          wonCount,
          lostCount,
          winRate: winRate ?? undefined
        }
        break
      }

      case 'avg-days': {
        // Won opportunities with days to close calculation
        let query = supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, actual_close_date,
            accounts(name)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .eq('stage', 'closed_won')
          .not('actual_close_date', 'is', null)
          .order('actual_close_date', { ascending: false })

        if (period !== 'all') {
          query = query
            .gte('actual_close_date', startISO)
            .lte('actual_close_date', endISO)
        }

        const { data: opportunities, error } = await query

        if (error) {
          log.error({ error }, 'Failed to fetch won opportunities for avg days')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const value = opp.amount || 0

          // Calculate days to close
          let daysToClose: number | null = null
          if (opp.actual_close_date && opp.created_at) {
            const created = new Date(opp.created_at)
            const closed = new Date(opp.actual_close_date)
            daysToClose = Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          }

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: null,
            amount: value,
            probability: 100,
            weightedValue: value,
            stage: 'closed_won',
            stageName: 'Closed Won',
            actualCloseDate: opp.actual_close_date,
            expectedCloseDate: null,
            closeReason: null,
            daysToClose,
            daysUntilClose: null
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)
        const daysValues = records.filter(r => r.daysToClose !== null).map(r => r.daysToClose!)
        const avgDaysToClose = daysValues.length > 0
          ? Math.round(daysValues.reduce((sum, d) => sum + d, 0) / daysValues.length)
          : null

        response = {
          type,
          period,
          periodLabel: `Won Opportunities - Days to Close`,
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue: totalValue,
          avgDaysToClose: avgDaysToClose ?? undefined
        }
        break
      }

      case 'avg-deal': {
        // Won opportunities in period for average deal size
        let query = supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, actual_close_date,
            accounts(name)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .eq('stage', 'closed_won')
          .order('actual_close_date', { ascending: false })

        if (period !== 'all') {
          query = query
            .gte('actual_close_date', startISO)
            .lte('actual_close_date', endISO)
        }

        const { data: opportunities, error } = await query

        if (error) {
          log.error({ error }, 'Failed to fetch won opportunities for avg deal')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const value = opp.amount || 0

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: null,
            amount: value,
            probability: 100,
            weightedValue: value,
            stage: 'closed_won',
            stageName: 'Closed Won',
            actualCloseDate: opp.actual_close_date,
            expectedCloseDate: null,
            closeReason: null,
            daysToClose: null,
            daysUntilClose: null
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)
        const avgDealSize = records.length > 0 ? Math.round(totalValue / records.length) : null

        response = {
          type,
          period,
          periodLabel: `Won Opportunities - ${periodLabel}`,
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue: totalValue,
          avgDealSize: avgDealSize ?? undefined
        }
        break
      }

      case 'closing-soon': {
        // Open opportunities with expected_close_date in next 7 days
        const { data: opportunities, error } = await supabase
          .from('opportunities')
          .select(`
            id, name, created_at, amount, stage, probability, expected_close_date,
            accounts(name),
            event_dates(event_date)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .in('stage', OPEN_STAGES)
          .gte('expected_close_date', todayISO)
          .lte('expected_close_date', closingSoonEndISO)
          .order('expected_close_date', { ascending: true })

        if (error) {
          log.error({ error }, 'Failed to fetch closing soon opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityDrilldownRecord[] = (opportunities || []).map((opp: any) => {
          const probability = opp.probability ?? getStageProbability(opp.stage, stages)
          const value = opp.amount || 0
          const eventDates = opp.event_dates || []
          const earliestEventDate = eventDates.length > 0
            ? eventDates.map((ed: any) => ed.event_date).filter(Boolean).sort()[0]
            : null

          // Calculate days until close
          let daysUntilClose: number | null = null
          if (opp.expected_close_date) {
            const expected = new Date(opp.expected_close_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            daysUntilClose = Math.round((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          }

          return {
            id: opp.id,
            name: opp.name,
            createdAt: opp.created_at,
            accountName: opp.accounts?.name || null,
            eventDate: earliestEventDate,
            amount: value,
            probability,
            weightedValue: value * (probability / 100),
            stage: opp.stage,
            stageName: getStageName(opp.stage, stages),
            actualCloseDate: null,
            expectedCloseDate: opp.expected_close_date,
            closeReason: null,
            daysToClose: null,
            daysUntilClose
          }
        })

        const totalValue = records.reduce((sum, r) => sum + r.amount, 0)
        const totalWeightedValue = records.reduce((sum, r) => sum + r.weightedValue, 0)

        response = {
          type,
          period: null,
          periodLabel: 'Closing Soon (Next 7 Days)',
          records,
          totalCount: records.length,
          totalValue,
          totalWeightedValue
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    const jsonResponse = NextResponse.json(response)
    jsonResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return jsonResponse
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/opportunities/drilldown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
