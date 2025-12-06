import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-notifications')

/**
 * GET - Get notification statistics
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Get all notifications
    const { data: notifications, error } = await supabase
      .from('inventory_notifications')
      .select('notification_type, status')
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error fetching notification statistics')
      return NextResponse.json(
        { error: 'Failed to fetch notification statistics', details: error.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const total = notifications?.length || 0
    const pending = notifications?.filter(n => n.status === 'pending').length || 0
    const sent = notifications?.filter(n => n.status === 'sent').length || 0
    const dismissed = notifications?.filter(n => n.status === 'dismissed').length || 0

    // Group by type
    const byType: Record<string, number> = {}
    notifications?.forEach(n => {
      byType[n.notification_type] = (byType[n.notification_type] || 0) + 1
    })

    const byTypeArray = Object.entries(byType).map(([type, count]) => ({
      type,
      count
    }))

    return NextResponse.json({
      total,
      pending,
      sent,
      dismissed,
      by_type: byTypeArray
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
