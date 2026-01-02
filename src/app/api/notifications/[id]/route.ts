import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:notifications:id')

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { session, supabase, dataSourceTenantId } = context
    const userId = session.user.id
    const { id: notificationId } = await params

    const { error } = await supabase
      .from('user_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('tenant_id', dataSourceTenantId)
      .eq('user_id', userId)

    if (error) {
      log.error({ error, notificationId }, 'Error marking notification as read')
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Unexpected error marking notification as read')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { session, supabase, dataSourceTenantId } = context
    const userId = session.user.id
    const { id: notificationId } = await params

    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('tenant_id', dataSourceTenantId)
      .eq('user_id', userId)

    if (error) {
      log.error({ error, notificationId }, 'Error deleting notification')
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Unexpected error deleting notification')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
