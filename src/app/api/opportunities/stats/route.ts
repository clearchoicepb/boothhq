import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

/**
 * GET /api/opportunities/stats
 * 
 * Returns aggregated statistics for all opportunities (not just current page)
 * Uses SQL aggregation for performance and scalability
 * 
 * Query Parameters:
 * - stage: Filter by stage (optional, default: 'all')
 * - owner_id: Filter by owner (optional, default: 'all')
 * 
 * Returns:
 * - total: Total count of opportunities
 * - openCount: Count of open opportunities (not closed)
 * - totalValue: Sum of all opportunity amounts
 * - expectedValue: Sum of probability-weighted values
 * - closedWonCount: Count of closed won opportunities
 * - closedWonValue: Sum of closed won amounts
 * - closedLostCount: Count of closed lost opportunities
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const stageFilter = searchParams.get('stage') || 'all'
    const ownerFilter = searchParams.get('owner_id')
    
    // Build query with filters
    let query = supabase
      .from('opportunities')
      .select('amount, probability, stage')
      .eq('tenant_id', session.user.tenantId)
    
    // Apply filters (same as main opportunities query)
    if (stageFilter !== 'all') {
      query = query.eq('stage', stageFilter)
    }
    
    if (ownerFilter && ownerFilter !== 'all') {
      if (ownerFilter === 'unassigned') {
        query = query.is('owner_id', null)
      } else {
        query = query.eq('owner_id', ownerFilter)
      }
    }
    
    const { data: opportunities, error } = await query
    
    if (error) {
      console.error('Error fetching opportunities for stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
    
    // Calculate statistics (JavaScript aggregation - fast for moderate datasets)
    const total = opportunities?.length || 0
    
    const totalValue = opportunities?.reduce((sum, opp) => 
      sum + (opp.amount || 0), 0
    ) || 0
    
    const expectedValue = opportunities?.reduce((sum, opp) => {
      const amount = opp.amount || 0
      const probability = opp.probability || 0
      return sum + (amount * probability / 100)
    }, 0) || 0
    
    const openOpportunities = opportunities?.filter(opp => 
      !['closed_won', 'closed_lost'].includes(opp.stage)
    ) || []
    
    const closedWonOpportunities = opportunities?.filter(opp => 
      opp.stage === 'closed_won'
    ) || []
    
    const closedLostOpportunities = opportunities?.filter(opp => 
      opp.stage === 'closed_lost'
    ) || []
    
    const stats = {
      total,
      openCount: openOpportunities.length,
      totalValue,
      expectedValue,
      closedWonCount: closedWonOpportunities.length,
      closedWonValue: closedWonOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0),
      closedLostCount: closedLostOpportunities.length,
      // Average opportunity value
      averageValue: total > 0 ? totalValue / total : 0,
      // Average probability
      averageProbability: total > 0 
        ? opportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / total 
        : 0
    }
    
    const response = NextResponse.json(stats)
    
    // Cache for 60 seconds (stats don't change frequently)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error in opportunities stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

