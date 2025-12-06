import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron')

/**
 * Vercel Cron Job - Consumable Stock Automation
 * Runs 3 times daily at 8:00 AM, 2:00 PM, and 8:00 PM UTC
 *
 * Schedule: 0 8,14,20 * * * (8 AM, 2 PM, 8 PM every day)
 *
 * Actions:
 * - Checks stock levels against category thresholds
 * - Creates low stock alerts
 * - Creates out of stock alerts (high priority)
 * - Processes all active tenants
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active tenants from application database
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('is_active', true)

    if (tenantsError) {
      log.error({ tenantsError }, 'Error fetching tenants')
      return NextResponse.json(
        { error: 'Failed to fetch tenants', details: tenantsError.message },
        { status: 500 }
      )
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tenants found',
        processed: 0
      })
    }

    // Process each tenant
    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        try {
          // Call automation endpoint for this tenant
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automation/consumables`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`
            },
            body: JSON.stringify({
              tenantId: tenant.id,
              action: 'all'
            })
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }

          const data = await response.json()
          return {
            tenant: tenant.subdomain,
            success: true,
            results: data.results
          }
        } catch (error: any) {
          log.error({ error }, 'Error processing tenant ${tenant.subdomain}')
          return {
            tenant: tenant.subdomain,
            success: false,
            error: error.message
          }
        }
      })
    )

    // Summarize results
    const summary = {
      total_tenants: tenants.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'rejected' })
    }

    console.log('Consumables cron completed:', summary)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary
    })
  } catch (error: any) {
    log.error({ error }, 'Cron error')
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
