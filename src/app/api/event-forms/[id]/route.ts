import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-forms:id')

/**
 * GET /api/event-forms/[id]
 * Fetch a single event form with full data (including fields and responses)
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const { id: formId } = params

    // Fetch the form with event data and event dates
    const { data: form, error } = await supabase
      .from('event_forms')
      .select(`
        *,
        events!inner (
          id,
          title,
          event_dates (
            id,
            event_date,
            start_time,
            end_time,
            location_id,
            locations (
              name
            )
          )
        )
      `)
      .eq('id', formId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 })
      }
      log.error({ error, formId }, 'Error fetching event form')
      return NextResponse.json(
        { error: 'Failed to fetch event form', details: error.message },
        { status: 500 }
      )
    }

    // Transform event dates for the response
    const eventDates = form.events?.event_dates?.map((d: any) => ({
      id: d.id,
      event_date: d.event_date,
      start_time: d.start_time,
      end_time: d.end_time,
      location_name: d.locations?.name || null,
    })) || []

    // Return form with event info
    const response = {
      id: form.id,
      name: form.name,
      fields: form.fields || [],
      responses: form.responses,
      status: form.status,
      public_id: form.public_id,
      sent_at: form.sent_at,
      viewed_at: form.viewed_at,
      completed_at: form.completed_at,
      created_at: form.created_at,
      event_id: form.event_id,
      event_name: form.events?.title || 'Unknown Event',
      event_dates: eventDates,
    }

    log.debug({ formId }, 'Event form fetched')

    return NextResponse.json(response)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/event-forms/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
