import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-dates')
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const eventDateId = params.id
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
      .eq('id', eventDateId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, 'Error fetching event date')
      return NextResponse.json({ error: 'Failed to fetch event date' }, { status: 500 })
    }

    const response = NextResponse.json(data)

    // Disable caching to ensure fresh data after updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')

    return response
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    log.debug({}, '=== EVENT DATE UPDATE API START ===')
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const eventDateId = params.id
    const body = await request.json()
    log.debug({ body }, 'Received body')
    
    // Sanitize UUID fields: convert empty strings to null
    const sanitizedBody = {
      ...body,
      location_id: body.location_id === '' ? null : body.location_id,
    }
    log.debug({ sanitizedBody }, 'Sanitized body')

    const { data, error } = await supabase
      .from('event_dates')
      .update(sanitizedBody)
      .eq('id', eventDateId)
      .eq('tenant_id', dataSourceTenantId)
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
      log.error({ error }, '[Event Date API] Supabase error')
      return NextResponse.json({ 
        error: 'Failed to update event date', 
        details: error.message,
        code: error.code,
        hint: error.hint 
      }, { status: 500 })
    }

    log.debug({}, 'Update successful')
    log.debug({}, '=== EVENT DATE UPDATE API END ===')
    
    const response = NextResponse.json(data)
    // Disable caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error: any) {
    log.error({ error }, '[Event Date API] Caught exception')
    console.error('[Event Date API] Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const eventDateId = params.id
    const { error } = await supabase
      .from('event_dates')
      .delete()
      .eq('id', eventDateId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting event date')
      return NextResponse.json({ error: 'Failed to delete event date', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}















