import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { MaintenanceAutomation } from '@/lib/automation/maintenanceAutomation'

/**
 * POST - Run maintenance automation
 * Creates tasks and notifications for due/overdue maintenance
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

    // Create maintenance tasks
    if (action === 'all' || action === 'tasks') {
      const taskResults = await MaintenanceAutomation.createMaintenanceTasks(tenantId)
      results.tasks = taskResults
    }

    // Create overdue notifications
    if (action === 'all' || action === 'notifications') {
      const notificationResults = await MaintenanceAutomation.createOverdueNotifications(tenantId)
      results.notifications = notificationResults
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in maintenance automation:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET - Get automation status
 * Returns current automation state for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Get maintenance items due soon
    const { data: dueSoon, error: dueSoonError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .not('next_maintenance_date', 'is', null)
      .lte('next_maintenance_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte('next_maintenance_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

    // Get overdue maintenance items
    const { data: overdue, error: overdueError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .not('next_maintenance_date', 'is', null)
      .lt('next_maintenance_date', new Date().toISOString())

    // Get pending maintenance notifications
    const { data: pendingNotifications, error: notificationsError } = await supabase
      .from('inventory_notifications')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('notification_type', 'maintenance_overdue')
      .eq('status', 'pending')

    return NextResponse.json({
      automation_status: 'active',
      items_due_soon: dueSoon?.length || 0,
      items_overdue: overdue?.length || 0,
      pending_notifications: pendingNotifications?.length || 0,
      last_check: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error getting automation status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
