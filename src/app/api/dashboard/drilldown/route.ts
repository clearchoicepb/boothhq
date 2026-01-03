import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { Tables } from '@/types/database'

const log = createLogger('api:dashboard:drilldown')

// Query result types for Supabase queries with joins
interface EventDateWithJoins {
  id: string
  event_date: string
  event_id: string
  location_id: string | null
  locations: { name: string } | null
  events: {
    id: string
    title: string
    status: string
    location: string | null
    account_id: string | null
    accounts: { name: string } | null
    event_categories: { name: string; color: string | null } | null
    event_types: { name: string } | null
  } | null
}

interface EventBookedWithAccount {
  id: string
  title: string
  created_at: string
  start_date: string | null
  opportunity_id: string | null
  account_id: string | null
  accounts: { name: string } | null
}

interface OpportunityWithAccountJoin {
  id: string
  name: string
  created_at: string
  amount: number | null
  stage: string
  expected_close_date: string | null
  account_id: string | null
  accounts: { name: string } | null
}

// Query result types for amount calculations
interface InvoiceAmountQueryResult {
  event_id: string | null
  total_amount: number | null
}
type OpportunityAmountQueryResult = Pick<Tables<'opportunities'>, 'id' | 'amount'>
interface TenantSettingRow {
  setting_key: string
  setting_value: string | null
}

export type DrilldownType = 'events-occurring' | 'events-booked' | 'total-opportunities' | 'new-opportunities'
export type DrilldownPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'

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
}

export interface EventBookedRecord {
  id: string
  createdAt: string
  eventName: string
  eventDate: string | null
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
      case 'yesterday':
        startISO = yesterdayISO
        endISO = yesterdayISO
        periodLabel = 'Yesterday'
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

        const records: EventOccurringRecord[] = ((eventDates || []) as unknown as EventDateWithJoins[]).map((ed) => ({
          id: ed.id,
          eventId: ed.events?.id || ed.event_id,
          eventDate: ed.event_date,
          eventName: ed.events?.title || 'Untitled Event',
          accountName: ed.events?.accounts?.name || null,
          location: ed.locations?.name || ed.events?.location || null,
          eventType: ed.events?.event_types?.name || null,
          eventCategory: ed.events?.event_categories?.name || null,
          eventCategoryColor: ed.events?.event_categories?.color || null
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
        const typedEvents = (events || []) as unknown as EventBookedWithAccount[]
        const eventIds = typedEvents.map((e) => e.id)
        const opportunityIds = typedEvents.map((e) => e.opportunity_id).filter(Boolean)

        const invoicesByEvent: Record<string, number> = {}
        const opportunityAmounts: Record<string, number> = {}

        if (eventIds.length > 0) {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('event_id, total_amount')
            .eq('tenant_id', dataSourceTenantId)
            .in('event_id', eventIds)

          if (invoices) {
            (invoices as InvoiceAmountQueryResult[]).forEach((inv) => {
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
            (opportunities as OpportunityAmountQueryResult[]).forEach((opp) => {
              opportunityAmounts[opp.id] = opp.amount || 0
            })
          }
        }

        const records: EventBookedRecord[] = typedEvents.map((e) => {
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
        const typedSettings = (stageSettings || []) as unknown as TenantSettingRow[]
        if (typedSettings.length > 0) {
          try {
            // Check for new format: single 'opportunities.stages' key with array value
            const arrayFormat = typedSettings.find((row) => row.setting_key === 'opportunities.stages')
            if (arrayFormat?.setting_value) {
              // Parse the array value (could be JSON string or already parsed)
              let parsedStages = arrayFormat.setting_value
              if (typeof parsedStages === 'string') {
                parsedStages = JSON.parse(parsedStages)
              }
              if (Array.isArray(parsedStages) && parsedStages.length > 0) {
                stages = parsedStages.filter((s: StageConfig) => s.enabled !== false)
              }
            } else {
              // Fallback to old format: indexed keys like opportunities.stages.0.id
              const stagesMap = new Map<number, Partial<StageConfig>>()
              typedSettings.forEach((row) => {
                const match = row.setting_key.match(/opportunities\.stages\.(\d+)\.(.+)/)
                if (match) {
                  const index = parseInt(match[1], 10)
                  const field = match[2] as keyof StageConfig

                  if (!stagesMap.has(index)) {
                    stagesMap.set(index, {})
                  }

                  const stage = stagesMap.get(index)!

                  // Parse value based on field type
                  if (field === 'probability') {
                    stage[field] = parseInt(String(row.setting_value), 10)
                  } else if (field === 'enabled') {
                    stage[field] = row.setting_value === 'true'
                  } else if (field === 'id' || field === 'name' || field === 'color') {
                    stage[field] = String(row.setting_value)
                  }
                }
              })

              // Convert map to array sorted by index
              const parsedStages = Array.from(stagesMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map((entry) => entry[1] as StageConfig)
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

        const records: OpportunityRecord[] = ((opportunities || []) as unknown as OpportunityWithAccountJoin[]).map((opp) => {
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
        const typedSettings = (stageSettings || []) as unknown as TenantSettingRow[]
        if (typedSettings.length > 0) {
          try {
            // Check for new format: single 'opportunities.stages' key with array value
            const arrayFormat = typedSettings.find((row) => row.setting_key === 'opportunities.stages')
            if (arrayFormat?.setting_value) {
              // Parse the array value (could be JSON string or already parsed)
              let parsedStages = arrayFormat.setting_value
              if (typeof parsedStages === 'string') {
                parsedStages = JSON.parse(parsedStages)
              }
              if (Array.isArray(parsedStages) && parsedStages.length > 0) {
                stages = parsedStages.filter((s: StageConfig) => s.enabled !== false)
              }
            } else {
              // Fallback to old format: indexed keys like opportunities.stages.0.id
              const stagesMap = new Map<number, Partial<StageConfig>>()
              typedSettings.forEach((row) => {
                const match = row.setting_key.match(/opportunities\.stages\.(\d+)\.(.+)/)
                if (match) {
                  const index = parseInt(match[1], 10)
                  const field = match[2] as keyof StageConfig

                  if (!stagesMap.has(index)) {
                    stagesMap.set(index, {})
                  }

                  const stage = stagesMap.get(index)!

                  // Parse value based on field type
                  if (field === 'probability') {
                    stage[field] = parseInt(String(row.setting_value), 10)
                  } else if (field === 'enabled') {
                    stage[field] = row.setting_value === 'true'
                  } else if (field === 'id' || field === 'name' || field === 'color') {
                    stage[field] = String(row.setting_value)
                  }
                }
              })

              // Convert map to array sorted by index
              const parsedStages = Array.from(stagesMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map((entry) => entry[1] as StageConfig)
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

        const records: OpportunityRecord[] = ((opportunities || []) as unknown as OpportunityWithAccountJoin[]).map((opp) => {
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
