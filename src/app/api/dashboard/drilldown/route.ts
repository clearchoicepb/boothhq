/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:dashboard:drilldown')

export type DrilldownType = 'events-occurring' | 'events-booked' | 'total-opportunities' | 'new-opportunities'
export type DrilldownPeriod = 'today' | 'week' | 'month' | 'year'

export interface EventOccurringRecord {
  id: string
  eventId: string
  eventDate: string
  eventName: string
  accountName: string | null
  location: string | null
  eventType: string | null
  eventCategory: string | null
  eventCategoryColor: string | null
  status: string
}

export interface EventBookedRecord {
  id: string
  createdAt: string
  eventName: string
  eventDate: string
  accountName: string | null
  revenue: number
}

export interface OpportunityRecord {
  id: string
  createdAt: string
  name: string
  accountName: string | null
  value: number
  probability: number
  weightedValue: number
  stage: string
  stageName: string
  stageColor: string | null
  expectedCloseDate: string | null
}

interface StageConfig {
  id: string
  name: string
  probability: number
  color?: string
  backgroundColor?: string
  textColor?: string
  enabled: boolean
}

const defaultStages: StageConfig[] = [
  { id: 'prospecting', name: 'Prospecting', probability: 10, color: 'blue', enabled: true },
  { id: 'qualification', name: 'Qualification', probability: 25, color: 'yellow', enabled: true },
  { id: 'proposal', name: 'Proposal', probability: 50, color: 'purple', enabled: true },
  { id: 'negotiation', name: 'Negotiation', probability: 75, color: 'orange', enabled: true },
  { id: 'closed_won', name: 'Closed Won', probability: 100, color: 'green', enabled: true },
  { id: 'closed_lost', name: 'Closed Lost', probability: 0, color: 'red', enabled: true }
]

function getStageName(stageId: string, stages: StageConfig[]): string {
  const stage = stages.find(s => s.id === stageId)
  if (stage?.name) return stage.name
  // Fallback: format the ID nicely ('closed_won' → 'Closed Won')
  return stageId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getStageColor(stageId: string, stages: StageConfig[]): string | null {
  const stage = stages.find(s => s.id === stageId)
  return stage?.color || stage?.backgroundColor || null
}

function getStageProbability(stageId: string, stages: StageConfig[]): number {
  const stage = stages.find(s => s.id === stageId)
  return stage?.probability ?? 0
}

export interface DrilldownResponse {
  type: DrilldownType
  period: DrilldownPeriod | null
  periodLabel: string
  records: EventOccurringRecord[] | EventBookedRecord[] | OpportunityRecord[]
  totalCount: number
  totalRevenue?: number
  totalWeightedRevenue?: number
}

/**
 * GET /api/dashboard/drilldown
 * Returns detailed records for dashboard KPI drilldowns
 *
 * Query params:
 * - type: 'events-occurring' | 'events-booked' | 'total-opportunities' | 'new-opportunities'
 * - period: 'week' | 'month' | 'year' (not used for total-opportunities)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type') as DrilldownType
    const period = searchParams.get('period') as DrilldownPeriod || 'month'

    if (!type) {
      return NextResponse.json({ error: 'type parameter is required' }, { status: 400 })
    }

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

    // Select date range based on period
    let startISO: string
    let endISO: string
    let periodLabel: string

    switch (period) {
      case 'today':
        startISO = todayISO
        endISO = todayISO
        periodLabel = 'Today'
        break
      case 'week':
        startISO = weekStartISO
        endISO = weekEndISO
        periodLabel = 'This Week'
        break
      case 'year':
        startISO = yearStartISO
        endISO = yearEndISO
        periodLabel = 'This Year'
        break
      case 'month':
      default:
        startISO = monthStartISO
        endISO = monthEndISO
        periodLabel = 'This Month'
    }

    let response: DrilldownResponse

    switch (type) {
      case 'events-occurring': {
        // Get event dates within the period with event details
        const { data: eventDates, error } = await supabase
          .from('event_dates')
          .select(`
            id,
            event_date,
            event_id,
            location_id,
            locations(name),
            events!inner(
              id,
              title,
              status,
              location,
              account_id,
              accounts(name),
              event_categories(name, color),
              event_types(name)
            )
          `)
          .eq('tenant_id', dataSourceTenantId)
          .gte('event_date', startISO)
          .lte('event_date', endISO)
          .order('event_date', { ascending: true })

        if (error) {
          log.error({ error }, 'Failed to fetch events occurring')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: EventOccurringRecord[] = (eventDates || []).map((ed: any) => ({
          id: ed.id,
          eventId: ed.events?.id || ed.event_id,
          eventDate: ed.event_date,
          eventName: ed.events?.title || 'Untitled Event',
          accountName: ed.events?.accounts?.name || null,
          location: ed.locations?.name || ed.events?.location || null,
          eventType: ed.events?.event_types?.name || null,
          eventCategory: ed.events?.event_categories?.name || null,
          eventCategoryColor: ed.events?.event_categories?.color || null,
          status: ed.events?.status || 'unknown'
        }))

        response = {
          type,
          period,
          periodLabel,
          records,
          totalCount: records.length
        }
        break
      }

      case 'events-booked': {
        // Get events created within the period
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select(`
            id,
            title,
            created_at,
            start_date,
            opportunity_id,
            account_id,
            accounts(name)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .gte('created_at', `${startISO}T00:00:00`)
          .lte('created_at', `${endISO}T23:59:59`)
          .order('created_at', { ascending: false })

        if (eventsError) {
          log.error({ error: eventsError }, 'Failed to fetch events booked')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        // Get invoices for these events
        const eventIds = (events || []).map((e: any) => e.id)
        const opportunityIds = (events || []).map((e: any) => e.opportunity_id).filter(Boolean)

        const invoicesByEvent: Record<string, number> = {}
        const opportunityAmounts: Record<string, number> = {}

        if (eventIds.length > 0) {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('event_id, total_amount')
            .eq('tenant_id', dataSourceTenantId)
            .in('event_id', eventIds)

          if (invoices) {
            invoices.forEach((inv: any) => {
              if (inv.event_id) {
                invoicesByEvent[inv.event_id] = (invoicesByEvent[inv.event_id] || 0) + (inv.total_amount || 0)
              }
            })
          }
        }

        if (opportunityIds.length > 0) {
          const { data: opportunities } = await supabase
            .from('opportunities')
            .select('id, amount')
            .in('id', opportunityIds)

          if (opportunities) {
            opportunities.forEach((opp: any) => {
              opportunityAmounts[opp.id] = opp.amount || 0
            })
          }
        }

        const records: EventBookedRecord[] = (events || []).map((e: any) => {
          let revenue = invoicesByEvent[e.id] || 0
          if (!revenue && e.opportunity_id && opportunityAmounts[e.opportunity_id]) {
            revenue = opportunityAmounts[e.opportunity_id]
          }
          return {
            id: e.id,
            createdAt: e.created_at,
            eventName: e.title || 'Untitled Event',
            eventDate: e.start_date,
            accountName: e.accounts?.name || null,
            revenue
          }
        })

        const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0)

        response = {
          type,
          period,
          periodLabel,
          records,
          totalCount: records.length,
          totalRevenue
        }
        break
      }

      case 'total-opportunities': {
        // Fetch configured stages from tenant_settings
        // Settings page saves stages as a single array under key 'opportunities.stages'
        const { data: stageSettings } = await supabase
          .from('tenant_settings')
          .select('setting_key, setting_value')
          .eq('tenant_id', dataSourceTenantId)
          .like('setting_key', 'opportunities.stages%')

        // Parse stages from settings
        let stages: StageConfig[] = defaultStages
        if (stageSettings && stageSettings.length > 0) {
          try {
            // Check for new format: single 'opportunities.stages' key with array value
            const arrayFormat = stageSettings.find((row: any) => row.setting_key === 'opportunities.stages')
            if (arrayFormat?.setting_value) {
              // Parse the array value (could be JSON string or already parsed)
              let parsedStages = arrayFormat.setting_value
              if (typeof parsedStages === 'string') {
                parsedStages = JSON.parse(parsedStages)
              }
              if (Array.isArray(parsedStages) && parsedStages.length > 0) {
                stages = parsedStages.filter((s: any) => s.enabled !== false)
              }
            } else {
              // Fallback to old format: indexed keys like opportunities.stages.0.id
              const stagesMap = new Map<number, any>()
              stageSettings.forEach((row: any) => {
                const match = row.setting_key.match(/opportunities\.stages\.(\d+)\.(.+)/)
                if (match) {
                  const index = parseInt(match[1], 10)
                  const field = match[2]

                  if (!stagesMap.has(index)) {
                    stagesMap.set(index, {})
                  }

                  const stage = stagesMap.get(index)!

                  // Parse value based on field type
                  if (field === 'probability') {
                    stage[field] = parseInt(row.setting_value, 10)
                  } else if (field === 'enabled') {
                    stage[field] = row.setting_value === 'true'
                  } else {
                    stage[field] = row.setting_value
                  }
                }
              })

              // Convert map to array sorted by index
              const parsedStages = Array.from(stagesMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map((entry) => entry[1])
                .filter((stage) => stage.enabled !== false)

              if (parsedStages.length > 0) {
                stages = parsedStages
              }
            }
          } catch (e) {
            log.warn({ error: e }, 'Failed to parse stage settings, using defaults')
          }
        }

        // Get all active opportunities
        const { data: opportunities, error } = await supabase
          .from('opportunities')
          .select(`
            id,
            name,
            created_at,
            amount,
            stage,
            expected_close_date,
            account_id,
            accounts(name)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .not('stage', 'in', '("closed_won","closed_lost")')
          .eq('is_converted', false)
          .order('amount', { ascending: false, nullsFirst: false })

        if (error) {
          log.error({ error }, 'Failed to fetch total opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityRecord[] = (opportunities || []).map((opp: any) => {
          const probability = getStageProbability(opp.stage, stages)
          const value = opp.amount || 0
          return {
            id: opp.id,
            createdAt: opp.created_at,
            name: opp.name,
            accountName: opp.accounts?.name || null,
            value,
            probability,
            weightedValue: value * (probability / 100),
            stage: opp.stage,
            stageName: getStageName(opp.stage, stages),
            stageColor: getStageColor(opp.stage, stages),
            expectedCloseDate: opp.expected_close_date
          }
        })

        const totalRevenue = records.reduce((sum, r) => sum + r.value, 0)
        const totalWeightedRevenue = records.reduce((sum, r) => sum + r.weightedValue, 0)

        response = {
          type,
          period: null,
          periodLabel: 'Active Pipeline',
          records,
          totalCount: records.length,
          totalRevenue,
          totalWeightedRevenue
        }
        break
      }

      case 'new-opportunities': {
        // Fetch configured stages from tenant_settings
        // Settings page saves stages as a single array under key 'opportunities.stages'
        const { data: stageSettings } = await supabase
          .from('tenant_settings')
          .select('setting_key, setting_value')
          .eq('tenant_id', dataSourceTenantId)
          .like('setting_key', 'opportunities.stages%')

        // Parse stages from settings
        let stages: StageConfig[] = defaultStages
        if (stageSettings && stageSettings.length > 0) {
          try {
            // Check for new format: single 'opportunities.stages' key with array value
            const arrayFormat = stageSettings.find((row: any) => row.setting_key === 'opportunities.stages')
            if (arrayFormat?.setting_value) {
              // Parse the array value (could be JSON string or already parsed)
              let parsedStages = arrayFormat.setting_value
              if (typeof parsedStages === 'string') {
                parsedStages = JSON.parse(parsedStages)
              }
              if (Array.isArray(parsedStages) && parsedStages.length > 0) {
                stages = parsedStages.filter((s: any) => s.enabled !== false)
              }
            } else {
              // Fallback to old format: indexed keys like opportunities.stages.0.id
              const stagesMap = new Map<number, any>()
              stageSettings.forEach((row: any) => {
                const match = row.setting_key.match(/opportunities\.stages\.(\d+)\.(.+)/)
                if (match) {
                  const index = parseInt(match[1], 10)
                  const field = match[2]

                  if (!stagesMap.has(index)) {
                    stagesMap.set(index, {})
                  }

                  const stage = stagesMap.get(index)!

                  // Parse value based on field type
                  if (field === 'probability') {
                    stage[field] = parseInt(row.setting_value, 10)
                  } else if (field === 'enabled') {
                    stage[field] = row.setting_value === 'true'
                  } else {
                    stage[field] = row.setting_value
                  }
                }
              })

              // Convert map to array sorted by index
              const parsedStages = Array.from(stagesMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map((entry) => entry[1])
                .filter((stage) => stage.enabled !== false)

              if (parsedStages.length > 0) {
                stages = parsedStages
              }
            }
          } catch (e) {
            log.warn({ error: e }, 'Failed to parse stage settings, using defaults')
          }
        }

        // Get opportunities created within the period
        const { data: opportunities, error } = await supabase
          .from('opportunities')
          .select(`
            id,
            name,
            created_at,
            amount,
            stage,
            account_id,
            accounts(name)
          `)
          .eq('tenant_id', dataSourceTenantId)
          .gte('created_at', `${startISO}T00:00:00`)
          .lte('created_at', `${endISO}T23:59:59`)
          .order('created_at', { ascending: false })

        if (error) {
          log.error({ error }, 'Failed to fetch new opportunities')
          return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
        }

        const records: OpportunityRecord[] = (opportunities || []).map((opp: any) => {
          const probability = getStageProbability(opp.stage, stages)
          const value = opp.amount || 0
          return {
            id: opp.id,
            createdAt: opp.created_at,
            name: opp.name,
            accountName: opp.accounts?.name || null,
            value,
            probability,
            weightedValue: value * (probability / 100),
            stage: opp.stage,
            stageName: getStageName(opp.stage, stages),
            stageColor: getStageColor(opp.stage, stages),
            expectedCloseDate: null
          }
        })

        const totalRevenue = records.reduce((sum, r) => sum + r.value, 0)
        const totalWeightedRevenue = records.reduce((sum, r) => sum + r.weightedValue, 0)

        response = {
          type,
          period,
          periodLabel,
          records,
          totalCount: records.length,
          totalRevenue,
          totalWeightedRevenue
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
    log.error({ error }, 'Unexpected error in GET /api/dashboard/drilldown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
