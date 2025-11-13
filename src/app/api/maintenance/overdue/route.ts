import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET - Get items with overdue maintenance
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
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
      .lt('next_maintenance_date', today)
      .order('next_maintenance_date', { ascending: true })

    if (error) {
      console.error('Error fetching overdue maintenance items:', error)
      return NextResponse.json(
        { error: 'Failed to fetch overdue maintenance items', details: error.message },
        { status: 500 }
      )
    }

    // Calculate days overdue
    const todayDate = new Date()
    const enrichedData = (data || []).map(item => {
      const nextDate = new Date(item.next_maintenance_date!)
      const diffTime = todayDate.getTime() - nextDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        ...item,
        days_overdue: diffDays,
        is_overdue: true
      }
    })

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
