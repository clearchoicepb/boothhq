import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { randomBytes } from 'crypto'

const log = createLogger('api:events:public-token')

/**
 * Generate a secure 64-character hex token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * POST /api/events/[id]/public-token
 * Regenerate the public token for an event
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
      .update({ public_token: newToken })
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id, public_token')
      .single()

    if (error) {
      log.error({ error, eventId }, 'Failed to regenerate public token')
      return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    log.info({ eventId }, 'Public token regenerated')
    return NextResponse.json({ public_token: data.public_token })
  } catch (error) {
    log.error({ error }, 'Unexpected error regenerating public token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/events/[id]/public-token
 * Toggle public page access (enable/disable)
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

    const { public_page_enabled } = body

    if (typeof public_page_enabled !== 'boolean') {
      return NextResponse.json({ error: 'public_page_enabled must be a boolean' }, { status: 400 })
    }

    // Update the event
    const { data, error } = await supabase
      .from('events')
      .update({ public_page_enabled })
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id, public_page_enabled')
      .single()

    if (error) {
      log.error({ error, eventId }, 'Failed to toggle public page access')
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    log.info({ eventId, enabled: public_page_enabled }, 'Public page access toggled')
    return NextResponse.json({ public_page_enabled: data.public_page_enabled })
  } catch (error) {
    log.error({ error }, 'Unexpected error toggling public page access')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
