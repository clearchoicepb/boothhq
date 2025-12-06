import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:maintenance')

/**
 * GET - Get maintenance statistics
 * Query params: date_from, date_to (optional date range filter)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build base query
    let query = supabase
      .from('maintenance_history')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)

    if (dateFrom) {
      query = query.gte('maintenance_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('maintenance_date', dateTo)
    }

    const { data: maintenanceRecords, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching maintenance statistics')
      return NextResponse.json(
        { error: 'Failed to fetch maintenance statistics', details: error.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalRecords = maintenanceRecords?.length || 0
    const totalCost = maintenanceRecords?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0
    const averageCost = totalRecords > 0 ? totalCost / totalRecords : 0

    // Group by maintenance type
    const byType: Record<string, { count: number; totalCost: number }> = {}
    maintenanceRecords?.forEach(record => {
      if (!byType[record.maintenance_type]) {
        byType[record.maintenance_type] = { count: 0, totalCost: 0 }
      }
      byType[record.maintenance_type].count++
      byType[record.maintenance_type].totalCost += record.cost || 0
    })

    const maintenanceByType = Object.entries(byType).map(([type, stats]) => ({
      type,
      count: stats.count,
      total_cost: stats.totalCost
    }))

    // Get items due soon and overdue
    const today = new Date().toISOString().split('T')[0]
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

    const { count: itemsDueSoon } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .not('next_maintenance_date', 'is', null)
      .gte('next_maintenance_date', today)
      .lte('next_maintenance_date', weekFromNowStr)

    const { count: itemsOverdue } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .not('next_maintenance_date', 'is', null)
      .lt('next_maintenance_date', today)

    return NextResponse.json({
      total_maintenance_records: totalRecords,
      total_cost: totalCost,
      average_cost: averageCost,
      items_due_soon: itemsDueSoon || 0,
      items_overdue: itemsOverdue || 0,
      maintenance_by_type: maintenanceByType
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
