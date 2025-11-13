import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - Get items due for maintenance
 * Query params: days_ahead (default: 7), include_overdue (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const daysAhead = parseInt(searchParams.get('days_ahead') || '7')
    const includeOverdue = searchParams.get('include_overdue') !== 'false'

    // Calculate date range
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const todayStr = today.toISOString().split('T')[0]
    const futureDateStr = futureDate.toISOString().split('T')[0]

    // Build query
    let query = supabase
      .from('inventory_items')
      .select(`
        id,
        item_name,
        item_category,
        serial_number,
        last_maintenance_date,
        next_maintenance_date,
        assigned_to_type,
        assigned_to_id
      `)
      .eq('tenant_id', dataSourceTenantId)
      .not('next_maintenance_date', 'is', null)

    if (includeOverdue) {
      // Items due today or in the future (up to daysAhead)
      query = query.lte('next_maintenance_date', futureDateStr)
    } else {
      // Only items due between today and daysAhead (exclude overdue)
      query = query
        .gte('next_maintenance_date', todayStr)
        .lte('next_maintenance_date', futureDateStr)
    }

    query = query.order('next_maintenance_date', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching items due for maintenance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch items due for maintenance', details: error.message },
        { status: 500 }
      )
    }

    // Calculate days until due and overdue status
    const enrichedData = (data || []).map(item => {
      const nextDate = new Date(item.next_maintenance_date!)
      const diffTime = nextDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        ...item,
        days_until_due: diffDays,
        is_overdue: diffDays < 0
      }
    })

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
