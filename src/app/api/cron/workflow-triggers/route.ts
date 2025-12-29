/**
 * Cron Job: Workflow Triggers
 *
 * Processes time-based workflow triggers:
 * - event_date_approaching: X days before event date
 * - task_overdue: When tasks become overdue (future)
 *
 * DEPLOYMENT:
 * - Vercel Cron: Add to vercel.json
 * - External Cron: Call this endpoint with Authorization header
 *
 * EXAMPLE vercel.json config:
 * ```json
 * {
 *   "crons": [{
 *     "path": "/api/cron/workflow-triggers",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 * ```
 *
 * SECURITY:
 * - Requires CRON_SECRET environment variable
 * - For Vercel Cron, uses CRON_SECRET header
 * - For external calls, use Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron')

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CRON_SECRET = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Days to check for approaching events (supports multiple thresholds)
const EVENT_APPROACHING_DAYS = [1, 3, 7, 14, 30]

// ═══════════════════════════════════════════════════════════════════════════
// AUTH VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function verifyAuth(request: NextRequest): boolean {
  // For Vercel Cron
  const cronSecret = request.headers.get('x-vercel-cron-secret')
  if (cronSecret && cronSecret === CRON_SECRET) {
    return true
  }

  // For external cron services
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const [type, token] = authHeader.split(' ')
    if (type === 'Bearer' && token === CRON_SECRET) {
      return true
    }
  }

  // Allow in development without auth
  if (process.env.NODE_ENV === 'development') {
    log.debug({}, 'Development mode - skipping auth')
    return true
  }

  return false
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  log.debug({}, 'Cron job started')

  // Verify authentication
  if (!verifyAuth(request)) {
    log.debug('Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results = {
    triggersProcessed: 0,
    workflowsExecuted: 0,
    eventsProcessed: 0,
    errors: [] as string[],
    tenants: [] as string[],
  }

  try {
    // Create admin Supabase client
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, database_connection_string')
      .eq('is_active', true)

    if (tenantsError) {
      log.error({ tenantsError }, '[CronWorkflowTriggers] Error fetching tenants')
      results.errors.push(`Failed to fetch tenants: ${tenantsError.message}`)
      return NextResponse.json({
        success: false,
        ...results,
        duration: Date.now() - startTime,
      })
    }

    if (!tenants || tenants.length === 0) {
      log.debug({}, 'No active tenants found')
      return NextResponse.json({
        success: true,
        message: 'No active tenants to process',
        ...results,
        duration: Date.now() - startTime,
      })
    }

    // Process each tenant
    for (const tenant of tenants) {
      try {
        log.debug({ tenantName: tenant.name, tenantId: tenant.id }, 'Processing tenant')
        results.tenants.push(tenant.id)

        // Create tenant-specific Supabase client
        // For multi-database setup, we would use tenant.database_connection_string
        // For now, we'll use the same database with tenant_id filtering
        const tenantResults = await processEventDateApproachingTriggers(
          supabase,
          tenant.id,
          tenant.id // dataSourceTenantId
        )

        results.triggersProcessed += tenantResults.triggersProcessed
        results.workflowsExecuted += tenantResults.workflowsExecuted
        results.eventsProcessed += tenantResults.eventsProcessed
        if (tenantResults.errors.length > 0) {
          results.errors.push(...tenantResults.errors.map(e => `[${tenant.name}] ${e}`))
        }
      } catch (tenantError) {
        const errorMsg = tenantError instanceof Error ? tenantError.message : 'Unknown error'
        log.error({ tenantError }, '[CronWorkflowTriggers] Error processing tenant ${tenant.id}')
        results.errors.push(`[${tenant.name}] ${errorMsg}`)
      }
    }

    log.debug({
      duration: Date.now() - startTime,
      ...results,
    }, 'Cron job completed')

    return NextResponse.json({
      success: results.errors.length === 0,
      ...results,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    log.error({ error }, '[CronWorkflowTriggers] Fatal error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...results,
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}

// Allow POST as alternative to GET for flexibility with cron services
export async function POST(request: NextRequest) {
  return GET(request)
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DATE APPROACHING TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════

async function processEventDateApproachingTriggers(
  supabase: ReturnType<typeof createClient<Database>>,
  tenantId: string,
  dataSourceTenantId: string
): Promise<{
  triggersProcessed: number
  workflowsExecuted: number
  eventsProcessed: number
  errors: string[]
}> {
  const results = {
    triggersProcessed: 0,
    workflowsExecuted: 0,
    eventsProcessed: 0,
    errors: [] as string[],
  }

  try {
    // Get all active workflows with event_date_approaching trigger
    // NOTE: design_item_types table has been deprecated. Templates are looked up at action execution time.
    const { data: workflows, error: workflowsError } = await supabase
      .from('workflows')
      .select(`
        *,
        actions:workflow_actions(
          *,
          task_template:task_templates(*),
          assigned_to_user:users(id, first_name, last_name, email, department, department_role)
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('trigger_type', 'event_date_approaching')
      .eq('is_active', true)

    if (workflowsError) {
      results.errors.push(`Failed to fetch workflows: ${workflowsError.message}`)
      return results
    }

    if (!workflows || workflows.length === 0) {
      log.debug({ tenantId }, 'No event_date_approaching workflows for tenant')
      return results
    }

    log.debug({ count: workflows.length }, 'Found event_date_approaching workflow(s)')

    // Get unique days_before values from all workflows
    const daysBeforeValues = new Set<number>()
    for (const workflow of workflows) {
      const daysBefore = (workflow.trigger_config as any)?.days_before
      if (daysBefore && typeof daysBefore === 'number') {
        daysBeforeValues.add(daysBefore)
      }
    }

    if (daysBeforeValues.size === 0) {
      log.debug({}, 'No valid days_before configurations found')
      return results
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Process each days_before value
    for (const daysBefore of daysBeforeValues) {
      // Calculate the target date
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + daysBefore)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      log.debug({ targetDateStr, daysBefore }, 'Looking for events')

      // Find events with that date
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', dataSourceTenantId)
        .or(`start_date.eq.${targetDateStr},event_date.eq.${targetDateStr}`)
        .neq('status', 'cancelled')

      if (eventsError) {
        results.errors.push(`Failed to fetch events: ${eventsError.message}`)
        continue
      }

      if (!events || events.length === 0) {
        log.debug({ targetDateStr }, 'No events found')
        continue
      }

      log.debug({ count: events.length, targetDateStr }, 'Found event(s)')
      results.eventsProcessed += events.length

      // Find workflows that match this days_before value
      const matchingWorkflows = workflows.filter(w => {
        const wDaysBefore = (w.trigger_config as any)?.days_before
        return wDaysBefore === daysBefore
      })

      // Import the trigger service
      const { workflowTriggerService } = await import('@/lib/services/workflowTriggerService')

      // Trigger workflows for each event
      for (const event of events) {
        for (const workflow of matchingWorkflows) {
          results.triggersProcessed++

          try {
            // Check if this workflow was already executed for this event today
            const executionKey = `approaching_${event.id}_${workflow.id}_${daysBefore}`
            const todayStart = new Date(today).toISOString()
            const tomorrowStart = new Date(today)
            tomorrowStart.setDate(tomorrowStart.getDate() + 1)

            const { data: existingExecution } = await supabase
              .from('workflow_executions')
              .select('id')
              .eq('workflow_id', workflow.id)
              .eq('trigger_entity_id', event.id)
              .eq('tenant_id', dataSourceTenantId)
              .gte('created_at', todayStart)
              .lt('created_at', tomorrowStart.toISOString())
              .single()

            if (existingExecution) {
              log.debug({ workflowId: workflow.id, eventId: event.id }, 'Workflow already executed for event today')
              continue
            }

            // Trigger the workflow
            const executionResults = await workflowTriggerService.onEventDateApproaching({
              event,
              daysUntilEvent: daysBefore,
              tenantId,
              dataSourceTenantId,
              supabase: supabase as any,
            })

            results.workflowsExecuted += executionResults.length
            log.debug({ count: executionResults.length, eventId: event.id }, 'Executed workflow(s) for event')
          } catch (executionError) {
            const errorMsg = executionError instanceof Error ? executionError.message : 'Unknown error'
            results.errors.push(`Failed to execute workflow ${workflow.id} for event ${event.id}: ${errorMsg}`)
          }
        }
      }
    }

    return results
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return results
  }
}
