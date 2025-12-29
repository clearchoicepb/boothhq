import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:events:notes')

/** Maximum length for customer notes */
const MAX_NOTE_LENGTH = 2000

/**
 * Get public Supabase client (no auth required)
 */
async function getPublicSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.DEFAULT_TENANT_DATA_URL!
  const serviceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * POST /api/public/events/[token]/notes
 * Submit a customer note on the public event page (no auth required)
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ token: string }> }
) {
  try {
    const params = await routeContext.params
    const { token } = params

    // Validate token format (64-character hex)
    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid event token' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { content } = body

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: 'Note content cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters` },
        { status: 400 }
      )
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch event by public_token to get event_id and tenant_id
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tenant_id, title, public_page_enabled')
      .eq('public_token', token)
      .single()

    if (eventError || !event) {
      log.error({ eventError, token: token.substring(0, 8) + '...' }, 'Event not found')
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if public page is enabled
    if (!event.public_page_enabled) {
      return NextResponse.json(
        { error: 'Public access is disabled for this event' },
        { status: 403 }
      )
    }

    // Insert the customer note into communications table
    const { data: communication, error: insertError } = await supabase
      .from('communications')
      .insert({
        tenant_id: event.tenant_id,
        event_id: event.id,
        communication_type: 'customer_note',
        direction: 'inbound',
        subject: 'Note from Customer',
        notes: trimmedContent,
        status: 'logged',
        communication_date: new Date().toISOString(),
        created_by: null, // No authenticated user for public submissions
      })
      .select('id')
      .single()

    if (insertError) {
      log.error({ insertError, eventId: event.id }, 'Failed to create customer note')
      return NextResponse.json(
        { error: 'Failed to submit note' },
        { status: 500 }
      )
    }

    log.info({
      eventId: event.id,
      communicationId: communication.id,
      eventTitle: event.title
    }, 'Customer note submitted')

    return NextResponse.json({
      success: true,
      message: 'Your note has been sent!'
    })
  } catch (error) {
    log.error({ error }, 'Error submitting customer note')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
