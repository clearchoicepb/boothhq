import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { randomBytes } from 'crypto'

const log = createLogger('api:events:staff-brief-token')

/**
 * Generate a secure 64-character hex token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * POST /api/events/[id]/staff-brief-token
 * Regenerate the staff brief token for an event
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const eventId = params.id

    // Generate new token
    const newToken = generateToken()

    // Update the event with new token
    const { data, error } = await supabase
      .from('events')
      .update({ staff_brief_token: newToken })
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id, staff_brief_token')
      .single()

    if (error) {
      log.error({ error, eventId }, 'Failed to regenerate staff brief token')
      return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    log.info({ eventId }, 'Staff brief token regenerated')
    return NextResponse.json({ staff_brief_token: data.staff_brief_token })
  } catch (error) {
    log.error({ error }, 'Unexpected error regenerating staff brief token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/events/[id]/staff-brief-token
 * Toggle staff brief access (enable/disable)
 */
export async function PATCH(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const eventId = params.id
    const body = await request.json()

    const { staff_brief_enabled } = body

    if (typeof staff_brief_enabled !== 'boolean') {
      return NextResponse.json({ error: 'staff_brief_enabled must be a boolean' }, { status: 400 })
    }

    // Update the event
    const { data, error } = await supabase
      .from('events')
      .update({ staff_brief_enabled })
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id, staff_brief_enabled')
      .single()

    if (error) {
      log.error({ error, eventId }, 'Failed to toggle staff brief access')
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    log.info({ eventId, enabled: staff_brief_enabled }, 'Staff brief access toggled')
    return NextResponse.json({ staff_brief_enabled: data.staff_brief_enabled })
  } catch (error) {
    log.error({ error }, 'Unexpected error toggling staff brief access')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
