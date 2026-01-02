import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:notifications:unread-count')

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications for current user
 * This is a lightweight endpoint designed for polling
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { session, supabase, dataSourceTenantId } = context
    const userId = session.user.id

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      log.error({ error }, 'Error fetching unread count')
      // Return 0 instead of error to avoid breaking the UI
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    log.error({ error }, 'Unexpected error fetching unread count')
    return NextResponse.json({ count: 0 })
  }
}
