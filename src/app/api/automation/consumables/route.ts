import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { ConsumableAutomation } from '@/lib/automation/consumableAutomation'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:automation')

/**
 * POST - Run consumable automation
 * Creates low stock and out of stock alerts
 * Intended to be called by cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tenantId, action = 'all' } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const results: Record<string, any> = {}

    // Create low stock alerts
    if (action === 'all' || action === 'low_stock') {
      const lowStockResults = await ConsumableAutomation.createLowStockAlerts(tenantId)
      results.low_stock = lowStockResults
    }

    // Create out of stock alerts
    if (action === 'all' || action === 'out_of_stock') {
      const outOfStockResults = await ConsumableAutomation.createOutOfStockAlerts(tenantId)
      results.out_of_stock = outOfStockResults
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    log.error({ error }, 'Error in consumable automation')
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET - Get consumable automation status
 * Returns current stock status for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Get all consumables with categories
    const { data: consumables, error: consumablesError } = await supabase
      .from('consumable_inventory')
      .select(`
        id,
        current_quantity,
        category:equipment_categories!consumable_inventory_category_id_fkey(
          id,
          name,
          low_stock_threshold
        )
      `)
      .eq('tenant_id', dataSourceTenantId)

    if (consumablesError) throw consumablesError

    let lowStockCount = 0
    let outOfStockCount = 0

    consumables?.forEach(consumable => {
      const threshold = consumable.category?.low_stock_threshold || 0
      if (consumable.current_quantity === 0) {
        outOfStockCount++
      } else if (consumable.current_quantity <= threshold) {
        lowStockCount++
      }
    })

    // Get pending stock notifications
    const { data: pendingNotifications, error: notificationsError } = await supabase
      .from('inventory_notifications')
      .select('id, notification_type')
      .eq('tenant_id', dataSourceTenantId)
      .in('notification_type', ['low_stock', 'out_of_stock'])
      .eq('status', 'pending')

    const lowStockNotifications = pendingNotifications?.filter(
      n => n.notification_type === 'low_stock'
    ).length || 0
    const outOfStockNotifications = pendingNotifications?.filter(
      n => n.notification_type === 'out_of_stock'
    ).length || 0

    return NextResponse.json({
      automation_status: 'active',
      total_consumables: consumables?.length || 0,
      low_stock_items: lowStockCount,
      out_of_stock_items: outOfStockCount,
      pending_low_stock_notifications: lowStockNotifications,
      pending_out_of_stock_notifications: outOfStockNotifications,
      last_check: new Date().toISOString()
    })
  } catch (error: any) {
    log.error({ error }, 'Error getting consumable automation status')
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
