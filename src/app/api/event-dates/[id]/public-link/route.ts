import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import crypto from 'crypto'

const log = createLogger('api:event-dates:public-link')

/**
 * Generate a URL-safe public ID (11 characters)
 */
function generatePublicId(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 11)
}

/**
 * GET /api/event-dates/[id]/public-link
 * Get or generate public link for an event date's logistics
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const { id: eventDateId } = params

    // Fetch the event_date
    const { data: eventDate, error: fetchError } = await supabase
      .from('event_dates')
      .select('id, public_id, event_id')
      .eq('id', eventDateId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !eventDate) {
      log.error({ error: fetchError }, 'Event date not found')
      return NextResponse.json({ error: 'Event date not found' }, { status: 404 })
    }

    // If public_id already exists, return it
    if (eventDate.public_id) {
      return NextResponse.json({
        public_id: eventDate.public_id,
        public_url: `/logistics/${eventDate.public_id}`
      })
    }

    // Generate a new public_id
    const publicId = generatePublicId()

    // Update the event_date with the new public_id
    const { error: updateError } = await supabase
      .from('event_dates')
      .update({ public_id: publicId })
      .eq('id', eventDateId)
      .eq('tenant_id', dataSourceTenantId)

    if (updateError) {
      log.error({ error: updateError }, 'Error generating public link')
      return NextResponse.json({ error: 'Failed to generate public link' }, { status: 500 })
    }

    return NextResponse.json({
      public_id: publicId,
      public_url: `/logistics/${publicId}`
    })
  } catch (error) {
    log.error({ error }, 'Error in GET /api/event-dates/[id]/public-link')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
