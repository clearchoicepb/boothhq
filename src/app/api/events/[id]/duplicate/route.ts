import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const eventId = params.id

    // Fetch the original event
    const { data: originalEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !originalEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Create a duplicate event
    const duplicateEvent = {
      ...originalEvent,
      id: undefined, // Let Supabase generate new ID
      title: `${originalEvent.title} (Copy)`,
      status: 'scheduled', // Reset to scheduled
      created_at: undefined,
      updated_at: undefined,
      // Keep dates, location, and other details
    }

    const { data: newEvent, error: createError } = await supabase
      .from('events')
      .insert(duplicateEvent)
      .select()
      .single()

    if (createError) {
      log.error({ createError }, 'Error creating duplicate event')
      return NextResponse.json({ error: 'Failed to duplicate event' }, { status: 500 })
    }

    // Track any partial failures during duplication
    const duplicateWarnings: string[] = []

    // Optionally, duplicate event_dates if they exist
    const { data: originalEventDates, error: eventDatesError } = await supabase
      .from('event_dates')
      .select('*')
      .eq('event_id', eventId)

    if (eventDatesError) {
      log.error({ error: eventDatesError, eventId }, 'Failed to fetch event dates for duplication')
      duplicateWarnings.push('Could not duplicate event dates')
    } else if (originalEventDates && originalEventDates.length > 0) {
      const duplicateEventDates = originalEventDates.map(date => ({
        ...date,
        id: undefined,
        event_id: newEvent.id,
        created_at: undefined,
        updated_at: undefined
      }))

      const { error: insertDatesError } = await supabase.from('event_dates').insert(duplicateEventDates)
      if (insertDatesError) {
        log.error({ error: insertDatesError, eventId, newEventId: newEvent.id }, 'Failed to insert duplicated event dates')
        duplicateWarnings.push('Could not duplicate event dates')
      }
    }

    // Note: Tasks are now managed through workflows and the unified Tasks table
    // When the event is created with an event_type_id, workflows will automatically
    // create the appropriate tasks for the new event

    // Return success with any warnings about partial failures
    return NextResponse.json({
      ...newEvent,
      warnings: duplicateWarnings.length > 0 ? duplicateWarnings : undefined
    }, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error duplicating event')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
