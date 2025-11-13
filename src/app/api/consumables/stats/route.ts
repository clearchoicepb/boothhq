import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - Get consumable usage statistics
 * Query params: consumable_id (optional), date_from, date_to (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const consumableId = searchParams.get('consumable_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query
    let query = supabase
      .from('consumable_usage_log')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)

    if (consumableId) {
      query = query.eq('consumable_id', consumableId)
    }

    if (dateFrom) {
      query = query.gte('usage_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('usage_date', dateTo)
    }

    const { data: usageLog, error } = await query

    if (error) {
      console.error('Error fetching usage statistics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch usage statistics', details: error.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalUsage = usageLog?.reduce((sum, log) => sum + log.quantity_used, 0) || 0

    // Group by usage type
    const byType: Record<string, { quantity: number; count: number }> = {}
    usageLog?.forEach(log => {
      if (!byType[log.usage_type]) {
        byType[log.usage_type] = { quantity: 0, count: 0 }
      }
      byType[log.usage_type].quantity += log.quantity_used
      byType[log.usage_type].count++
    })

    const usageByType = Object.entries(byType).map(([type, stats]) => ({
      type,
      quantity: stats.quantity,
      count: stats.count
    }))

    // Group by month (last 12 months)
    const byMonth: Record<string, number> = {}
    usageLog?.forEach(log => {
      const month = log.usage_date.substring(0, 7) // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + log.quantity_used
    })

    const usageByMonth = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, quantity]) => ({ month, quantity }))

    // Calculate average per event
    const eventUsage = usageLog?.filter(log => log.usage_type === 'event' && log.event_id) || []
    const totalEvents = new Set(eventUsage.map(log => log.event_id)).size
    const averagePerEvent = totalEvents > 0 ? totalUsage / totalEvents : 0

    return NextResponse.json({
      total_usage: totalUsage,
      usage_by_type: usageByType,
      usage_by_month: usageByMonth,
      average_per_event: averagePerEvent,
      total_events: totalEvents
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
