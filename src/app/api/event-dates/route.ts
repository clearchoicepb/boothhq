import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-dates')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunity_id') || searchParams.get('opportunityId')
    const eventId = searchParams.get('event_id') || searchParams.get('eventId')
    const status = searchParams.get('status')
    
    let query = supabase
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
      .order('event_date', { ascending: true })

    // Filter by opportunity or event
    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId)
    }
    
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching event dates')
      return NextResponse.json({ error: 'Failed to fetch event dates' }, { status: 500 })
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

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    // Validate that either opportunity_id or event_id is provided, but not both
    if (!body.opportunity_id && !body.event_id) {
      return NextResponse.json({ error: 'Either opportunity_id or event_id must be provided' }, { status: 400 })
    }

    if (body.opportunity_id && body.event_id) {
      return NextResponse.json({ error: 'Cannot provide both opportunity_id and event_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('event_dates')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
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
      log.error({ error }, 'Error creating event date')
      return NextResponse.json({ error: 'Failed to create event date', details: error.message }, { status: 500 })
    }

    const response = NextResponse.json(data)
    // Disable caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}















