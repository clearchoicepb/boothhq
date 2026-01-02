import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:notifications')

/**
 * GET /api/notifications
 * Fetch paginated notifications for current user
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { session, supabase, dataSourceTenantId } = context
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', dataSourceTenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error, count } = await query

    if (error) {
      log.error({ error }, 'Error fetching notifications')
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    })
  } catch (error) {
    log.error({ error }, 'Unexpected error fetching notifications')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/notifications
 * Mark all notifications as read for current user
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { session, supabase, dataSourceTenantId } = context
    const userId = session.user.id

    const { error } = await supabase
      .from('user_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('tenant_id', dataSourceTenantId)
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      log.error({ error }, 'Error marking notifications as read')
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Unexpected error marking notifications as read')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
