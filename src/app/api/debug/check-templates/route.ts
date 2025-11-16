import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to check if templates table exists
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, tenantId } = context

    console.log('Tenant ID:', tenantId)
    console.log('Data Source Tenant ID:', dataSourceTenantId)

    // Try to query templates table
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Templates table error:', error)
      return NextResponse.json({
        status: 'error',
        message: 'Templates table query failed',
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        tenantId,
        dataSourceTenantId
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Templates table exists and is accessible',
      count: data?.length || 0,
      tenantId,
      dataSourceTenantId
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error',
      error: error.message
    }, { status: 500 })
  }
}
