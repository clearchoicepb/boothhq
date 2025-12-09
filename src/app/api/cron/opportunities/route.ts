import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron:opportunities')

/**
 * Vercel Cron Job - Opportunity Automations
 * Runs daily at 6:00 AM UTC
 *
 * Schedule: 0 6 * * * (Every day at 6 AM)
 *
 * Actions:
 * - Marks stale opportunities (stage unchanged for 21+ days)
 * - Auto-closes opportunities with passed event dates
 * - Processes all active tenants
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      log.warn({}, 'Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    log.info({}, 'Starting opportunity automation cron job')

    // Call the automation endpoint directly
    const automationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/opportunities/automation`

    const response = await fetch(automationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      body: JSON.stringify({
        action: 'run-all',
        dryRun: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error({ status: response.status, error: errorText }, 'Automation endpoint failed')
      return NextResponse.json(
        { error: 'Automation failed', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()

    log.info(
      {
        tenantsProcessed: result.tenantsProcessed,
        totalStale: result.summary?.totalStale,
        totalAutoClosed: result.summary?.totalAutoClosed,
        totalErrors: result.summary?.totalErrors
      },
      'Opportunity automation cron completed'
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error: any) {
    log.error({ error }, 'Cron error')
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
