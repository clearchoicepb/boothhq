import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:debug')
/**
 * Debug endpoint to check if design tables exist in tenant database
 * and show sample data
 */
export async function GET() {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  const results: any = {
    tenantId: session.user.tenantId,
    timestamp: new Date().toISOString(),
    tables: {}
  }

  try {
    // Check design_statuses table
    try {
      const { data, error, count } = await supabase
        .from('design_statuses')
        .select('*', { count: 'exact' })
        .eq('tenant_id', dataSourceTenantId)
        .limit(5)

      results.tables.design_statuses = {
        exists: !error,
        error: error?.message || null,
        count: count || 0,
        sampleData: data || []
      }
    } catch (e: any) {
      results.tables.design_statuses = {
        exists: false,
        error: e.message,
        count: 0,
        sampleData: []
      }
    }

    // Check design_item_types table
    try {
      const { data, error, count } = await supabase
        .from('design_item_types')
        .select('*', { count: 'exact' })
        .eq('tenant_id', dataSourceTenantId)
        .limit(5)

      results.tables.design_item_types = {
        exists: !error,
        error: error?.message || null,
        count: count || 0,
        sampleData: data || []
      }
    } catch (e: any) {
      results.tables.design_item_types = {
        exists: false,
        error: e.message,
        count: 0,
        sampleData: []
      }
    }

    // Check event_design_items table
    try {
      const { data, error, count } = await supabase
        .from('event_design_items')
        .select('*', { count: 'exact' })
        .eq('tenant_id', dataSourceTenantId)
        .limit(5)

      results.tables.event_design_items = {
        exists: !error,
        error: error?.message || null,
        count: count || 0,
        sampleData: data || []
      }
    } catch (e: any) {
      results.tables.event_design_items = {
        exists: false,
        error: e.message,
        count: 0,
        sampleData: []
      }
    }

    // Test a simple known table (events) to confirm connection works
    try {
      const { data, error, count } = await supabase
        .from('events')
        .select('id', { count: 'exact' })
        .eq('tenant_id', dataSourceTenantId)
        .limit(1)

      results.connectionTest = {
        success: !error,
        error: error?.message || null,
        eventsCount: count || 0
      }
    } catch (e: any) {
      results.connectionTest = {
        success: false,
        error: e.message,
        eventsCount: 0
      }
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    log.error({ error }, 'Error in design tables debug')
    return NextResponse.json({
      error: error.message,
      tenantId: session.user.tenantId
    }, { status: 500 })
  }
}
