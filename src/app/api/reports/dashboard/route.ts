import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    const previousStartDate = new Date()

    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        previousStartDate.setDate(previousStartDate.getDate() - 14)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        previousStartDate.setDate(previousStartDate.getDate() - 60)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        previousStartDate.setDate(previousStartDate.getDate() - 180)
        break
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1)
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 2)
        break
    }

    const supabase = createServerSupabaseClient()
    const tenantId = session.user.tenantId

    // Get total revenue (from invoices)
    const { data: currentRevenue } = await supabase
      .from('invoices')
      .select('total')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { data: previousRevenue } = await supabase
      .from('invoices')
      .select('total')
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    const totalRevenue = currentRevenue?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
    const prevRevenue = previousRevenue?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

    // Get total events
    const { data: currentEvents } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { data: previousEvents } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    const totalEvents = currentEvents?.length || 0
    const prevEvents = previousEvents?.length || 0
    const eventsChange = prevEvents > 0 ? ((totalEvents - prevEvents) / prevEvents) * 100 : 0

    // Get active leads
    const { data: currentLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    const { data: allLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())

    const { data: previousLeadsCount } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    const activeLeads = currentLeads?.length || 0
    const prevLeadsCount = previousLeadsCount?.length || 0
    const currentLeadsCount = allLeads?.length || 0
    const leadsChange = prevLeadsCount > 0 ? ((currentLeadsCount - prevLeadsCount) / prevLeadsCount) * 100 : 0

    // Get conversion rate (leads to opportunities)
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())

    const conversionRate = currentLeadsCount > 0
      ? ((opportunities?.length || 0) / currentLeadsCount * 100).toFixed(1)
      : 0

    // Get revenue by month (last 6 months for chart)
    const revenueByMonth = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      monthEnd.setHours(23, 59, 59, 999)

      const { data: monthRevenue } = await supabase
        .from('invoices')
        .select('total')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      const revenue = monthRevenue?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

      revenueByMonth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Math.round(revenue)
      })
    }

    // Get leads by source
    const { data: leadsData } = await supabase
      .from('leads')
      .select('source')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())

    const sourceMap = new Map<string, number>()
    leadsData?.forEach(lead => {
      const source = lead.source || 'Unknown'
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    })

    const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      count
    }))

    // Get opportunity pipeline
    const { data: opportunitiesData } = await supabase
      .from('opportunities')
      .select('stage, value')
      .eq('tenant_id', tenantId)

    const stageMap = new Map<string, { value: number; count: number }>()
    opportunitiesData?.forEach(opp => {
      const stage = opp.stage || 'Unknown'
      const current = stageMap.get(stage) || { value: 0, count: 0 }
      stageMap.set(stage, {
        value: current.value + (opp.value || 0),
        count: current.count + 1
      })
    })

    const opportunityPipeline = Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      value: Math.round(data.value),
      count: data.count
    }))

    return NextResponse.json({
      dashboard: {
        totalRevenue: Math.round(totalRevenue),
        totalEvents,
        activeLeads,
        conversionRate: parseFloat(conversionRate as string),
        revenueChange: Math.round(revenueChange * 10) / 10,
        eventsChange: Math.round(eventsChange * 10) / 10,
        leadsChange: Math.round(leadsChange * 10) / 10
      },
      revenueByMonth,
      leadsBySource,
      opportunityPipeline
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
