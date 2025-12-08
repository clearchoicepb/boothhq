/**
 * Opportunity Automation API
 *
 * Handles automated stage transitions for opportunities:
 * 1. Stale Lead: Move open opportunities to 'stale' if:
 *    - Stage unchanged for 21+ days, OR
 *    - Opportunity created 30+ days ago
 *    AND event date is in future (or no event date)
 * 2. Auto Close-Lost: Move open opportunities to 'closed_lost' if event date has passed
 *
 * This endpoint processes ALL tenants and is designed to be called by a cron job.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { getTenantClient, getTenantIdInDataSource } from '@/lib/data-sources'
import { CLOSED_STAGES } from '@/lib/constants/opportunity-stages'
import { createLogger } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const log = createLogger('api:opportunities:automation')

// Automation configuration
const STALE_THRESHOLD_DAYS = 21          // Days without stage change
const STALE_AGE_THRESHOLD_DAYS = 30      // Days since creation
const AUTO_CLOSE_REASON = 'Auto-Closed - Event Passed'

type AutomationAction = 'process-stale' | 'auto-close' | 'run-all'

interface AutomationRequest {
  action: AutomationAction
  tenantId?: string // Optional: run for specific tenant only
  dryRun?: boolean // Optional: log what would happen without making changes
}

interface TenantResult {
  tenantId: string
  stale: { processed: number; opportunityIds: string[] }
  autoClosed: { processed: number; opportunityIds: string[] }
  errors: string[]
}

interface AutomationResponse {
  success: boolean
  action: AutomationAction
  dryRun: boolean
  tenantsProcessed: number
  results: TenantResult[]
  summary: {
    totalStale: number
    totalAutoClosed: number
    totalErrors: number
  }
  timestamp: string
}

/**
 * Check if opportunity has an event date in the future (for stale check)
 * Returns true if no event date exists (eligible for stale)
 */
async function hasEventInFuture(
  opportunityId: string,
  tenantDb: any,
  tenantId: string
): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString().split('T')[0]

  // Check event_dates table first (multi-date events)
  const { data: eventDates } = await tenantDb
    .from('event_dates')
    .select('event_date')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: true })
    .limit(1)

  if (eventDates?.length > 0) {
    const earliestDate = eventDates[0].event_date
    return earliestDate >= todayISO
  }

  // Fallback to opportunity fields
  const { data: opp } = await tenantDb
    .from('opportunities')
    .select('event_date, final_date')
    .eq('id', opportunityId)
    .single()

  const eventDate = opp?.final_date || opp?.event_date
  if (!eventDate) return true // No date = eligible for stale

  return eventDate >= todayISO
}

/**
 * Check if opportunity's event date has passed (for auto-close)
 * Returns false if no event date exists (don't auto-close)
 */
async function hasEventPassed(
  opportunityId: string,
  tenantDb: any,
  tenantId: string
): Promise<{ passed: boolean; eventDate: string | null }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString().split('T')[0]

  // Check event_dates table first - get the LATEST date for multi-date events
  const { data: eventDates } = await tenantDb
    .from('event_dates')
    .select('event_date')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false })
    .limit(1)

  if (eventDates?.length > 0) {
    const latestDate = eventDates[0].event_date
    return { passed: latestDate < todayISO, eventDate: latestDate }
  }

  // Fallback to opportunity fields
  const { data: opp } = await tenantDb
    .from('opportunities')
    .select('event_date, final_date')
    .eq('id', opportunityId)
    .single()

  const eventDate = opp?.final_date || opp?.event_date
  if (!eventDate) return { passed: false, eventDate: null } // No date = don't auto-close

  return { passed: eventDate < todayISO, eventDate }
}

/**
 * Process stale opportunities for a tenant
 *
 * Conditions for stale:
 * 1. Stage hasn't changed in 21+ days, OR
 * 2. Opportunity was created 30+ days ago
 *
 * AND the opportunity is open (not in closed stages)
 * AND the event date is in the future (or no event date)
 */
async function processStaleOpportunities(
  tenantDb: any,
  tenantId: string,
  dryRun: boolean
): Promise<{ processed: number; opportunityIds: string[]; errors: string[] }> {
  const errors: string[] = []
  const processedIds: string[] = []

  try {
    // Calculate threshold dates
    const stageThresholdDate = new Date()
    stageThresholdDate.setDate(stageThresholdDate.getDate() - STALE_THRESHOLD_DAYS)
    const stageThresholdISO = stageThresholdDate.toISOString()

    const ageThresholdDate = new Date()
    ageThresholdDate.setDate(ageThresholdDate.getDate() - STALE_AGE_THRESHOLD_DAYS)
    const ageThresholdISO = ageThresholdDate.toISOString()

    // Build the NOT IN filter for closed stages
    const closedStagesFilter = `(${CLOSED_STAGES.join(',')})`

    // Find opportunities that are stale candidates based on stage_changed_at
    const { data: stageStaleCandidates, error: stageQueryError } = await tenantDb
      .from('opportunities')
      .select('id, name, stage, stage_changed_at, created_at')
      .eq('tenant_id', tenantId)
      .not('stage', 'in', closedStagesFilter)
      .lt('stage_changed_at', stageThresholdISO)

    if (stageQueryError) {
      errors.push(`Stage query error: ${stageQueryError.message}`)
    }

    // Find opportunities that are stale candidates based on created_at (30+ days old)
    const { data: ageStaleCandidates, error: ageQueryError } = await tenantDb
      .from('opportunities')
      .select('id, name, stage, stage_changed_at, created_at')
      .eq('tenant_id', tenantId)
      .not('stage', 'in', closedStagesFilter)
      .lt('created_at', ageThresholdISO)

    if (ageQueryError) {
      errors.push(`Age query error: ${ageQueryError.message}`)
    }

    // Combine candidates, removing duplicates
    const candidateMap = new Map<string, { id: string; name: string; stage: string; reason: string }>()

    for (const opp of (stageStaleCandidates || [])) {
      candidateMap.set(opp.id, { ...opp, reason: 'stage_unchanged_21_days' })
    }

    for (const opp of (ageStaleCandidates || [])) {
      if (!candidateMap.has(opp.id)) {
        candidateMap.set(opp.id, { ...opp, reason: 'created_over_30_days' })
      }
    }

    const candidates = Array.from(candidateMap.values())

    if (candidates.length === 0) {
      return { processed: 0, opportunityIds: [], errors }
    }

    log.info({ count: candidates.length, tenantId }, 'Found stale candidates')

    // Filter to only those with future or no event dates
    for (const opp of candidates) {
      try {
        const hasEventFuture = await hasEventInFuture(opp.id, tenantDb, tenantId)

        if (hasEventFuture) {
          if (dryRun) {
            log.info({ opportunityId: opp.id, name: opp.name, reason: opp.reason }, '[DRY RUN] Would mark as stale')
            processedIds.push(opp.id)
          } else {
            // Update to stale stage
            const { error: updateError } = await tenantDb
              .from('opportunities')
              .update({
                stage: 'stale',
                updated_at: new Date().toISOString()
              })
              .eq('id', opp.id)

            if (updateError) {
              errors.push(`Failed to update ${opp.id}: ${updateError.message}`)
            } else {
              log.info({ opportunityId: opp.id, name: opp.name, reason: opp.reason }, 'Marked as stale')
              processedIds.push(opp.id)
            }
          }
        }
      } catch (err: any) {
        errors.push(`Error processing ${opp.id}: ${err.message}`)
      }
    }

    return { processed: processedIds.length, opportunityIds: processedIds, errors }
  } catch (err: any) {
    errors.push(`Unexpected error: ${err.message}`)
    return { processed: 0, opportunityIds: [], errors }
  }
}

/**
 * Process auto-close opportunities for a tenant
 */
async function processAutoCloseOpportunities(
  tenantDb: any,
  tenantId: string,
  dryRun: boolean
): Promise<{ processed: number; opportunityIds: string[]; errors: string[] }> {
  const errors: string[] = []
  const processedIds: string[] = []

  try {
    // Build the NOT IN filter for closed stages (but don't include 'stale' - we DO want to auto-close stale)
    const closedStagesFilter = '(closed_won,closed_lost)'

    // Find opportunities that might need auto-closing
    // These are opportunities not yet won/lost that might have passed event dates
    const { data: candidates, error: queryError } = await tenantDb
      .from('opportunities')
      .select('id, name, stage, event_date, final_date')
      .eq('tenant_id', tenantId)
      .not('stage', 'in', closedStagesFilter)

    if (queryError) {
      errors.push(`Query error: ${queryError.message}`)
      return { processed: 0, opportunityIds: [], errors }
    }

    if (!candidates || candidates.length === 0) {
      return { processed: 0, opportunityIds: [], errors }
    }

    const today = new Date()
    const todayISO = today.toISOString().split('T')[0]

    // Check each candidate for passed event dates
    for (const opp of candidates) {
      try {
        const { passed, eventDate } = await hasEventPassed(opp.id, tenantDb, tenantId)

        if (passed && eventDate) {
          if (dryRun) {
            log.info(
              { opportunityId: opp.id, name: opp.name, eventDate },
              '[DRY RUN] Would auto-close as lost'
            )
            processedIds.push(opp.id)
          } else {
            // Update to closed_lost with reason
            const { error: updateError } = await tenantDb
              .from('opportunities')
              .update({
                stage: 'closed_lost',
                actual_close_date: todayISO,
                close_reason: AUTO_CLOSE_REASON,
                close_notes: `Event date was ${eventDate}. Automatically closed because event date passed.`,
                updated_at: new Date().toISOString()
              })
              .eq('id', opp.id)

            if (updateError) {
              errors.push(`Failed to update ${opp.id}: ${updateError.message}`)
            } else {
              log.info(
                { opportunityId: opp.id, name: opp.name, eventDate },
                'Auto-closed as lost (event passed)'
              )
              processedIds.push(opp.id)
            }
          }
        }
      } catch (err: any) {
        errors.push(`Error processing ${opp.id}: ${err.message}`)
      }
    }

    return { processed: processedIds.length, opportunityIds: processedIds, errors }
  } catch (err: any) {
    errors.push(`Unexpected error: ${err.message}`)
    return { processed: 0, opportunityIds: [], errors }
  }
}

/**
 * Process automation for a single tenant
 */
async function processAutomationForTenant(
  tenantId: string,
  action: AutomationAction,
  dryRun: boolean
): Promise<TenantResult> {
  const result: TenantResult = {
    tenantId,
    stale: { processed: 0, opportunityIds: [] },
    autoClosed: { processed: 0, opportunityIds: [] },
    errors: []
  }

  try {
    // Get tenant database client
    const tenantDb = await getTenantClient(tenantId, true)
    const dataSourceTenantId = await getTenantIdInDataSource(tenantId)

    // Process stale opportunities
    if (action === 'process-stale' || action === 'run-all') {
      const staleResult = await processStaleOpportunities(tenantDb, dataSourceTenantId, dryRun)
      result.stale = {
        processed: staleResult.processed,
        opportunityIds: staleResult.opportunityIds
      }
      result.errors.push(...staleResult.errors)
    }

    // Process auto-close opportunities
    if (action === 'auto-close' || action === 'run-all') {
      const autoCloseResult = await processAutoCloseOpportunities(tenantDb, dataSourceTenantId, dryRun)
      result.autoClosed = {
        processed: autoCloseResult.processed,
        opportunityIds: autoCloseResult.opportunityIds
      }
      result.errors.push(...autoCloseResult.errors)
    }
  } catch (err: any) {
    result.errors.push(`Tenant error: ${err.message}`)
    log.error({ error: err, tenantId }, 'Error processing tenant')
  }

  return result
}

/**
 * POST /api/opportunities/automation
 *
 * Process opportunity automations (stale lead, auto-close)
 *
 * Authorization: Requires CRON_SECRET or valid session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization - multiple methods supported
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Check for API key authentication (cron or manual)
    const hasApiKeyAuth =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      authHeader === `Bearer ${process.env.AUTOMATION_API_KEY}`

    // Check for session authentication (UI-based triggers)
    const session = await getServerSession(authOptions)
    const hasSessionAuth = !!session?.user

    if (!hasApiKeyAuth && !hasSessionAuth) {
      log.warn('Unauthorized automation request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: AutomationRequest = await request.json()
    const { action = 'run-all', dryRun = false } = body
    let { tenantId } = body

    if (!['process-stale', 'auto-close', 'run-all'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: process-stale, auto-close, or run-all' },
        { status: 400 }
      )
    }

    // For session-based auth, automatically scope to user's tenant
    // This ensures users can only run automations for their own tenant
    if (hasSessionAuth && !hasApiKeyAuth) {
      const userTenantId = (session?.user as any)?.tenantId
      if (userTenantId) {
        tenantId = userTenantId
        log.info({ tenantId }, 'Session auth: scoping to user tenant')
      }
    }

    log.info({ action, tenantId, dryRun }, 'Starting opportunity automation')

    const results: TenantResult[] = []

    if (tenantId) {
      // Process single tenant
      const result = await processAutomationForTenant(tenantId, action, dryRun)
      results.push(result)
    } else {
      // Get all active tenants from application database
      const appDb = createServerSupabaseClient()
      const { data: tenants, error: tenantsError } = await appDb
        .from('tenants')
        .select('id')
        .eq('status', 'active')

      if (tenantsError) {
        log.error({ error: tenantsError }, 'Failed to fetch tenants')
        return NextResponse.json(
          { error: 'Failed to fetch tenants' },
          { status: 500 }
        )
      }

      if (!tenants || tenants.length === 0) {
        log.info('No active tenants found')
        return NextResponse.json({
          success: true,
          action,
          dryRun,
          tenantsProcessed: 0,
          results: [],
          summary: { totalStale: 0, totalAutoClosed: 0, totalErrors: 0 },
          timestamp: new Date().toISOString()
        })
      }

      // Process each tenant
      for (const tenant of tenants) {
        const result = await processAutomationForTenant(tenant.id, action, dryRun)
        results.push(result)
      }
    }

    // Calculate summary
    const summary = {
      totalStale: results.reduce((sum, r) => sum + r.stale.processed, 0),
      totalAutoClosed: results.reduce((sum, r) => sum + r.autoClosed.processed, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
    }

    const response: AutomationResponse = {
      success: true,
      action,
      dryRun,
      tenantsProcessed: results.length,
      results,
      summary,
      timestamp: new Date().toISOString()
    }

    log.info(
      {
        action,
        dryRun,
        tenantsProcessed: results.length,
        ...summary
      },
      'Opportunity automation completed'
    )

    return NextResponse.json(response)
  } catch (error: any) {
    log.error({ error }, 'Unexpected error in opportunity automation')
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/opportunities/automation
 *
 * Health check / status endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    description: 'Opportunity automation API',
    actions: ['process-stale', 'auto-close', 'run-all'],
    config: {
      staleThresholdDays: STALE_THRESHOLD_DAYS,
      staleAgeThresholdDays: STALE_AGE_THRESHOLD_DAYS,
      autoCloseReason: AUTO_CLOSE_REASON
    }
  })
}
