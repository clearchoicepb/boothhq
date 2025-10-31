import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const supabase = getTenantDatabaseClient()
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
      console.error('Error creating duplicate event:', createError)
      return NextResponse.json({ error: 'Failed to duplicate event' }, { status: 500 })
    }

    // Optionally, duplicate event_dates if they exist
    const { data: originalEventDates } = await supabase
      .from('event_dates')
      .select('*')
      .eq('event_id', eventId)

    if (originalEventDates && originalEventDates.length > 0) {
      const duplicateEventDates = originalEventDates.map(date => ({
        ...date,
        id: undefined,
        event_id: newEvent.id,
        created_at: undefined,
        updated_at: undefined
      }))

      await supabase.from('event_dates').insert(duplicateEventDates)
    }

    // Copy core task completions (but mark as incomplete)
    const { data: originalTaskCompletions } = await supabase
      .from('event_core_task_completion')
      .select('*')
      .eq('event_id', eventId)

    if (originalTaskCompletions && originalTaskCompletions.length > 0) {
      const duplicateTaskCompletions = originalTaskCompletions.map(task => ({
        event_id: newEvent.id,
        core_task_template_id: task.core_task_template_id,
        is_completed: false, // Reset to incomplete
        completed_at: null,
        completed_by: null,
        created_at: undefined,
        updated_at: undefined
      }))

      await supabase.from('event_core_task_completion').insert(duplicateTaskCompletions)
    }

    return NextResponse.json(newEvent, { status: 201 })
  } catch (error) {
    console.error('Error duplicating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
