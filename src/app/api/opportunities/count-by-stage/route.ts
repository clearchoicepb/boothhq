import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Count opportunities in this stage for the authenticated user's tenant
    const { count, error: countError } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', session.user.tenantId)
      .eq('stage', stage)

    if (countError) {
      console.error('Error counting opportunities:', countError)
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
    console.error('Error in count-by-stage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

