import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:inventory-notifications')

/**
 * POST - Dismiss multiple notifications
 * Batch dismiss operation
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()

    // Validation
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required and must not be empty' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('inventory_notifications')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_by: session?.user?.id
      })
      .in('id', body.ids)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (error) {
      log.error({ error }, 'Error dismissing notifications')
      return NextResponse.json(
        { error: 'Failed to dismiss notifications', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dismissed_count: data?.length || 0
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
