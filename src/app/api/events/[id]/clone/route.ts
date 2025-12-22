import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')
/**
 * POST /api/events/[id]/clone
 * 
 * Clones an event with all related data
 * - Event dates
 * - Staff assignments
 * - Design items
 * - Core task templates (but resets completion status)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id: eventId } = await params
    // Fetch original event
    const { data: original, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !original) {
      log.error({ fetchError }, 'Error fetching event')
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Create clone with modified title
    const clone = {
      ...original,
      id: undefined, // Let database generate new ID
      title: `${original.title} (Copy)`,
      created_at: undefined,
      updated_at: undefined,
    }

    const { data: newEvent, error: createError } = await supabase
      .from('events')
      .insert(clone)
      .select()
      .single()

    if (createError) {
      log.error({ createError }, 'Error creating clone')
      return NextResponse.json({ 
        error: 'Failed to clone event',
        details: createError.message 
      }, { status: 500 })
    }

    // Track any partial failures during cloning
    const cloneWarnings: string[] = []

    // Clone event_dates
    const { data: eventDates, error: eventDatesError } = await supabase
      .from('event_dates')
      .select('*')
      .eq('event_id', eventId)

    if (eventDatesError) {
      log.error({ error: eventDatesError, eventId }, 'Failed to fetch event dates for cloning')
      cloneWarnings.push('Could not clone event dates')
    } else if (eventDates && eventDates.length > 0) {
      const clonedDates = eventDates.map(ed => ({
        tenant_id: dataSourceTenantId,
        event_id: newEvent.id,
        opportunity_id: ed.opportunity_id,
        event_date: ed.event_date,
        start_time: ed.start_time,
        end_time: ed.end_time,
        location_id: ed.location_id,
        notes: ed.notes,
        status: ed.status
      }))

      const { error: insertDatesError } = await supabase.from('event_dates').insert(clonedDates)
      if (insertDatesError) {
        log.error({ error: insertDatesError, eventId, newEventId: newEvent.id }, 'Failed to insert cloned event dates')
        cloneWarnings.push('Could not clone event dates')
      }
    }

    // Clone event_staff
    const { data: staff, error: staffError } = await supabase
      .from('event_staff')
      .select('*')
      .eq('event_id', eventId)

    if (staffError) {
      log.error({ error: staffError, eventId }, 'Failed to fetch event staff for cloning')
      cloneWarnings.push('Could not clone staff assignments')
    } else if (staff && staff.length > 0) {
      const clonedStaff = staff.map(s => ({
        tenant_id: dataSourceTenantId,
        event_id: newEvent.id,
        user_id: s.user_id,
        staff_role_id: s.staff_role_id,
        status: s.status,
        notes: s.notes
      }))

      const { error: insertStaffError } = await supabase.from('event_staff').insert(clonedStaff)
      if (insertStaffError) {
        log.error({ error: insertStaffError, eventId, newEventId: newEvent.id }, 'Failed to insert cloned staff')
        cloneWarnings.push('Could not clone staff assignments')
      }
    }

    // Clone design_items (if table exists)
    const { data: designItems, error: designItemsError } = await supabase
      .from('design_items')
      .select('*')
      .eq('event_id', eventId)

    if (designItemsError) {
      // Table might not exist for this tenant - don't treat as error
      log.debug({ error: designItemsError, eventId }, 'Could not fetch design items (table may not exist)')
    } else if (designItems && designItems.length > 0) {
      const clonedItems = designItems.map(item => ({
        ...item,
        id: undefined,
        event_id: newEvent.id,
        created_at: undefined
      }))

      const { error: insertDesignError } = await supabase.from('design_items').insert(clonedItems)
      if (insertDesignError) {
        log.error({ error: insertDesignError, eventId, newEventId: newEvent.id }, 'Failed to insert cloned design items')
        cloneWarnings.push('Could not clone design items')
      }
    }

    // Note: Tasks are now managed through workflows and the unified Tasks table
    // When the event is created with an event_type_id, workflows will automatically
    // create the appropriate tasks for the new event

    // Return success with any warnings about partial failures
    return NextResponse.json({
      success: true,
      event: newEvent,
      warnings: cloneWarnings.length > 0 ? cloneWarnings : undefined
    })

  } catch (error) {
    log.error({ error }, 'Unexpected error cloning event')
    return NextResponse.json({ 
      error: 'Failed to clone event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

