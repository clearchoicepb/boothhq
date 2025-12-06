import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:opportunities')
/**
 * GET /api/opportunities/count-by-stage
 * 
 * Count opportunities in a specific stage
 * Used for validation before deleting stages
 * 
 * Query params:
 * - stage: Stage ID to count (required)
 * 
 * Returns:
 * - count: Number of opportunities in the stage
 * - stage: The stage ID that was queried
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user using NextAuth
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage parameter is required' },
        { status: 400 }
      )
    }

    // Count opportunities in this stage for the authenticated user's tenant
    const { count, error: countError } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .eq('stage', stage)

    if (countError) {
      log.error({ countError }, 'Error counting opportunities')
      return NextResponse.json(
        { error: 'Failed to count opportunities' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: count || 0,
      stage
    })

  } catch (error) {
    log.error({ error }, 'Error in count-by-stage')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

