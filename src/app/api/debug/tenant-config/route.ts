import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:debug')

/**
 * DEBUG ENDPOINT: Check tenant database configuration
 * This endpoint helps diagnose if the tenant has proper database connection configured
 */
export async function GET(request: NextRequest) {
  try {
    log.debug({}, '=== TENANT CONFIG DEBUG START ===')

    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    log.debug({
      id: session.user.id,
      email: session.user.email,
      tenantId: dataSourceTenantId,
      tenantName: session.user.tenantName
    }, 'Session user')

    // Query APPLICATION database for tenant metadata
    const appDb = createServerSupabaseClient()

    const { data: tenant, error } = await appDb
      .from('tenants')
      .select('id, name, subdomain, data_source_url, data_source_region, tenant_id_in_data_source, status')
      .eq('id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, '[Debug] Failed to fetch tenant')
      return NextResponse.json({
        error: 'Failed to fetch tenant configuration',
        details: error.message,
        tenantId: dataSourceTenantId
      }, { status: 500 })
    }

    if (!tenant) {
      log.error({ dataSourceTenantId }, '[Debug] Tenant not found')
      return NextResponse.json({
        error: 'Tenant not found',
        tenantId: dataSourceTenantId
      }, { status: 404 })
    }

    log.debug({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      hasDataSourceUrl: !!tenant.data_source_url,
      dataSourceUrl: tenant.data_source_url ? tenant.data_source_url.substring(0, 30) + '...' : null,
      region: tenant.data_source_region,
      status: tenant.status
    }, 'Tenant found')

    // Test if we can connect to tenant database
    let canConnectToTenantDb = false
    let tenantDbError = null

    if (tenant.data_source_url) {
      try {
        const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
        const tenantDb = await getTenantDatabaseClient(dataSourceTenantId)

        // Try a simple query
        const { data: testData, error: testError } = await tenantDb
          .from('locations')
          .select('id')
          .limit(1)

        if (testError) {
          tenantDbError = {
            message: testError.message,
            code: testError.code,
            details: testError.details
          }
          log.error({ tenantDbError }, '[Debug] Tenant DB query failed')
        } else {
          canConnectToTenantDb = true
          log.debug({}, 'Successfully connected to tenant database')
        }
      } catch (err: any) {
        tenantDbError = {
          message: err.message,
          stack: err.stack
        }
        log.error({ tenantDbError }, '[Debug] Tenant DB connection error')
      }
    }

    const response = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        tenantIdInDataSource: tenant.tenant_id_in_data_source
      },
      dataSource: {
        configured: !!tenant.data_source_url,
        url: tenant.data_source_url ? tenant.data_source_url.substring(0, 50) + '...' : null,
        region: tenant.data_source_region,
        canConnect: canConnectToTenantDb,
        error: tenantDbError
      },
      diagnostics: {
        sessionValid: true,
        tenantFound: true,
        dataSourceConfigured: !!tenant.data_source_url,
        databaseAccessible: canConnectToTenantDb
      }
    }

    log.debug({ response }, 'Response')
    log.debug({}, '=== TENANT CONFIG DEBUG END ===')

    return NextResponse.json(response)
  } catch (error: any) {
    log.error({ message: error.message, stack: error.stack }, 'Unexpected error')
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
