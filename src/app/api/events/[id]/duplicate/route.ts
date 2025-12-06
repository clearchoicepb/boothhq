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

    // Copy core task completions (but mark as incomplete)
    const { data: originalTaskCompletions, error: taskCompletionsError } = await supabase
      .from('event_core_task_completion')
      .select('*')
      .eq('event_id', eventId)

    if (taskCompletionsError) {
      log.error({ error: taskCompletionsError, eventId }, 'Failed to fetch task completions for duplication')
      duplicateWarnings.push('Could not duplicate task checklist')
    } else if (originalTaskCompletions && originalTaskCompletions.length > 0) {
      const duplicateTaskCompletions = originalTaskCompletions.map(task => ({
        event_id: newEvent.id,
        core_task_template_id: task.core_task_template_id,
        is_completed: false, // Reset to incomplete
        completed_at: null,
        completed_by: null,
        created_at: undefined,
        updated_at: undefined
      }))

      const { error: insertTasksError } = await supabase.from('event_core_task_completion').insert(duplicateTaskCompletions)
      if (insertTasksError) {
        log.error({ error: insertTasksError, newEventId: newEvent.id }, 'Failed to insert duplicated task completions')
        duplicateWarnings.push('Could not duplicate task checklist')
      }
    }

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
