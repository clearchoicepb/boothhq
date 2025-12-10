import { getTenantContext } from '@/lib/tenant-helpers';
import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger'

const log = createLogger('api:test-tenant-data')

/**
 * Test endpoint to verify tenant data access
 *
 * GET /api/test-tenant-data
 *
 * Returns diagnostic info about tenant connection and data
 */
export async function GET() {
  try {
    const context = await getTenantContext();
    if (context instanceof NextResponse) return context;

    const { supabase, dataSourceTenantId, session } = context;

    const results: any = {
      authentication: {
        userId: session.user.id,
        userEmail: session.user.email,
        applicationTenantId: session.user.tenantId,
      },
      tenantMapping: {
        dataSourceTenantId,
        mappingActive: session.user.tenantId !== dataSourceTenantId,
      },
      data: {},
      errors: [],
    };

    // Test each table
    const tables = ['accounts', 'contacts', 'events', 'opportunities'];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table as any)
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', dataSourceTenantId);

        if (error) {
          results.errors.push({
            table,
            error: error.message,
            code: error.code,
          });
          results.data[table] = { error: error.message };
        } else {
          results.data[table] = {
            count: count || 0,
            queryUsedTenantId: dataSourceTenantId,
          };
        }
      } catch (err: any) {
        results.errors.push({
          table,
          error: err.message,
        });
        results.data[table] = { error: err.message };
      }
    }

    // Summary
    const totalRecords: number = Object.values(results.data)
      .filter((d: any) => !d.error)
      .reduce((sum: number, d: any) => sum + (d.count || 0), 0);

    results.summary = {
      totalRecords: totalRecords as number,
      tablesWithData: Object.entries(results.data)
        .filter(([_, d]: any) => !d.error && d.count > 0)
        .map(([table]) => table),
      tablesWithErrors: results.errors.map((e: any) => e.table),
      status: results.errors.length === 0 && totalRecords > 0 ? 'SUCCESS' : 'ISSUES_FOUND',
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    log.error({ error }, 'Test endpoint error');
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
