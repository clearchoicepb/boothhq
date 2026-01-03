import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events:dates')

// GET /api/events/[id]/dates - Get all dates for an event
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const eventId = params.id

    // Verify event exists and belongs to tenant
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch event dates
    const { data, error } = await supabase
      .from('event_dates')
      .select(`
        *,
        locations (
          id,
          name,
          address_line1,
          city,
          state
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .order('event_date', { ascending: true })

    if (error) {
      log.error({ error, eventId }, 'Error fetching event dates')
      return NextResponse.json({ error: 'Failed to fetch event dates' }, { status: 500 })
    }

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    log.error({ error }, 'Error fetching event dates')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[id]/dates - Create a new date for an event
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const eventId = params.id

    // Verify event exists and belongs to tenant
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('event_dates')
      .insert({
        ...body,
        event_id: eventId,
        tenant_id: dataSourceTenantId,
        created_by: session?.user?.id,
        updated_by: session?.user?.id
      })
      .select(`
        *,
        locations (
          id,
          name,
          address_line1,
          city,
          state
        )
      `)
      .single()

    if (error) {
      log.error({ error, eventId }, 'Error creating event date')
      return NextResponse.json({ error: 'Failed to create event date', details: error.message }, { status: 500 })
    }

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    log.error({ error }, 'Error creating event date')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
