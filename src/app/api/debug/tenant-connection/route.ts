/**
 * Debug endpoint to test tenant database connection
 *
 * Usage: GET /api/debug/tenant-connection
 *
 * Returns connection info and tests the connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataSourceManager } from '@/lib/data-sources';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({
        error: 'Unauthorized - No tenant ID in session',
        hint: 'Make sure you are logged in'
      }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Test 1: Get connection info (no sensitive keys)
    let connectionInfo;
    try {
      connectionInfo = await dataSourceManager.getTenantConnectionInfo(tenantId);
    } catch (error: any) {
      return NextResponse.json({
        error: 'Failed to get connection info',
        message: error.message,
        tenantId,
        hint: 'Check if tenant record has data_source_url configured'
      }, { status: 500 });
    }

    // Test 2: Test actual connection
    let connectionTest;
    try {
      connectionTest = await dataSourceManager.testTenantConnection(tenantId);
    } catch (error: any) {
      return NextResponse.json({
        error: 'Connection test failed',
        message: error.message,
        tenantId,
        connectionInfo,
        hint: 'Check if tenant data database is accessible'
      }, { status: 500 });
    }

    // Test 3: Get cache stats
    const cacheStats = dataSourceManager.getCacheStats();

    // Test 4: Try a simple query
    let queryTest;
    try {
      const client = await dataSourceManager.getClientForTenant(tenantId, true);
      const dataSourceTenantId = await dataSourceManager.getTenantIdInDataSource(tenantId);

      const { data, error } = await client
        .from('accounts')
        .select('id, name')
        .eq('tenant_id', dataSourceTenantId)
        .limit(5);

      queryTest = {
        success: !error,
        error: error?.message,
        recordCount: data?.length || 0,
        sampleData: data?.slice(0, 2) // First 2 records only
      };
    } catch (error: any) {
      queryTest = {
        success: false,
        error: error.message
      };
    }

    // Success response
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      tenantId,
      user: {
        id: session.user.id,
        email: session.user.email,
        tenantName: session.user.tenantName
      },
      connectionInfo: {
        url: connectionInfo.url,
        region: connectionInfo.region,
        poolConfig: connectionInfo.poolConfig,
        isCached: connectionInfo.isCached,
        cacheExpiry: connectionInfo.cacheExpiry
      },
      connectionTest: {
        success: connectionTest.success,
        responseTimeMs: connectionTest.responseTimeMs,
        diagnostics: connectionTest.diagnostics,
        error: connectionTest.error
      },
      queryTest,
      cacheStats,
      checks: {
        hasConnectionInfo: !!connectionInfo,
        canConnect: connectionTest.success,
        canQuery: queryTest.success,
        cacheWorking: cacheStats.configCacheSize > 0 || cacheStats.clientCacheSize > 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
