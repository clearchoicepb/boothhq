import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
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
      console.error('Error fetching event:', fetchError)
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
      console.error('Error creating clone:', createError)
      return NextResponse.json({ 
        error: 'Failed to clone event',
        details: createError.message 
      }, { status: 500 })
    }

    // Clone event_dates
    const { data: eventDates } = await supabase
      .from('event_dates')
      .select('*')
      .eq('event_id', eventId)

    if (eventDates && eventDates.length > 0) {
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

      await supabase.from('event_dates').insert(clonedDates)
    }

    // Clone event_staff
    const { data: staff } = await supabase
      .from('event_staff')
      .select('*')
      .eq('event_id', eventId)

    if (staff && staff.length > 0) {
      const clonedStaff = staff.map(s => ({
        tenant_id: dataSourceTenantId,
        event_id: newEvent.id,
        user_id: s.user_id,
        staff_role_id: s.staff_role_id,
        status: s.status,
        notes: s.notes
      }))

      await supabase.from('event_staff').insert(clonedStaff)
    }

    // Clone design_items (if table exists)
    const { data: designItems } = await supabase
      .from('design_items')
      .select('*')
      .eq('event_id', eventId)
      .limit(1) // Test if table exists

    if (designItems) {
      const { data: allDesignItems } = await supabase
        .from('design_items')
        .select('*')
        .eq('event_id', eventId)

      if (allDesignItems && allDesignItems.length > 0) {
        const clonedItems = allDesignItems.map(item => ({
          ...item,
          id: undefined,
          event_id: newEvent.id,
          created_at: undefined
        }))

        await supabase.from('design_items').insert(clonedItems)
      }
    }

    // Initialize core task completions for new event (don't copy old completion status)
    const { data: coreTaskTemplates } = await supabase
      .from('core_task_templates')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('is_active', true)

    if (coreTaskTemplates && coreTaskTemplates.length > 0) {
      const taskCompletions = coreTaskTemplates.map(template => ({
        tenant_id: dataSourceTenantId,
        event_id: newEvent.id,
        core_task_template_id: template.id,
        is_completed: false,
        completed_at: null,
        completed_by: null
      }))

      await supabase.from('event_core_task_completion').insert(taskCompletions)
    }

    return NextResponse.json({ 
      success: true, 
      event: newEvent 
    })

  } catch (error) {
    console.error('Unexpected error cloning event:', error)
    return NextResponse.json({ 
      error: 'Failed to clone event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

