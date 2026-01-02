import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, insertWithTenantId } from '@/lib/tenant-helpers'
import { nanoid } from 'nanoid'
import { addHours, format } from 'date-fns'
import { createLogger } from '@/lib/logger'
import type { SendStaffFormsRequest } from '@/types/staff-forms'

const log = createLogger('api:staff-forms:send')

interface EventDateInfo {
  id: string
  event_date: string
  end_time: string | null
}

/**
 * POST /api/staff-forms/send
 * Send staff forms to selected staff members
 * For multi-day events, creates forms + tasks for each staff assignment per date
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body: SendStaffFormsRequest = await request.json()

    // Validate required fields
    if (!body.event_id || !body.template_id || !body.staff_assignment_ids?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, template_id, staff_assignment_ids' },
        { status: 400 }
      )
    }

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('event_form_templates')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('id', body.template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Fetch the event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, end_date')
      .eq('tenant_id', dataSourceTenantId)
      .eq('id', body.event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Fetch event dates (for multi-day support)
    let eventDates: EventDateInfo[] = []
    if (body.event_date_ids && body.event_date_ids.length > 0) {
      // Use specific dates if provided
      const { data: dates } = await supabase
        .from('event_dates')
        .select('id, event_date, end_time')
        .eq('tenant_id', dataSourceTenantId)
        .in('id', body.event_date_ids)
        .order('event_date', { ascending: true })
      eventDates = dates || []
    } else {
      // Fetch all dates for the event
      const { data: dates } = await supabase
        .from('event_dates')
        .select('id, event_date, end_time')
        .eq('tenant_id', dataSourceTenantId)
        .eq('event_id', body.event_id)
        .order('event_date', { ascending: true })
      eventDates = dates || []
    }

    const isMultiDay = eventDates.length > 1

    // Fetch staff assignments with user info
    const { data: assignments, error: assignmentsError } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        user_id,
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .in('id', body.staff_assignment_ids)

    if (assignmentsError) {
      log.error({ error: assignmentsError }, 'Failed to fetch staff assignments')
      return NextResponse.json({ error: 'Failed to fetch staff assignments' }, { status: 500 })
    }

    // Check for existing forms
    // For multi-day: check by (staff_assignment_id, event_date_id)
    // For single-day: check by (staff_assignment_id, event_id) where event_date_id is null
    let existingFormQuery = supabase
      .from('staff_forms')
      .select('staff_assignment_id, event_date_id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', body.event_id)
      .in('staff_assignment_id', body.staff_assignment_ids)

    const { data: existingForms } = await existingFormQuery

    // Build set of existing (assignment_id, date_id) combos
    const existingCombos = new Set(
      (existingForms || []).map(f => `${f.staff_assignment_id}:${f.event_date_id || 'null'}`)
    )

    const createdForms: { id: string; public_id: string; task_id: string | null; event_date_id: string | null }[] = []
    const errors: { assignment_id: string; event_date_id: string | null; error: string }[] = []
    let skippedCount = 0

    // For each assignment and each date, create a form
    for (const assignment of assignments || []) {
      const user = assignment.users as { id: string; first_name: string; last_name: string; email: string }

      if (isMultiDay) {
        // Multi-day: create one form per date
        for (const eventDate of eventDates) {
          const comboKey = `${assignment.id}:${eventDate.id}`
          if (existingCombos.has(comboKey)) {
            skippedCount++
            continue
          }

          try {
            const result = await createFormAndTask({
              supabase,
              dataSourceTenantId,
              sessionUserId: session.user.id,
              event,
              eventDate,
              assignment,
              user,
              template,
            })

            if (result.error) {
              errors.push({ assignment_id: assignment.id, event_date_id: eventDate.id, error: result.error })
            } else {
              createdForms.push({
                id: result.formId!,
                public_id: result.publicId!,
                task_id: result.taskId,
                event_date_id: eventDate.id,
              })
            }
          } catch (err) {
            log.error({ error: err, assignmentId: assignment.id, eventDateId: eventDate.id }, 'Error processing')
            errors.push({ assignment_id: assignment.id, event_date_id: eventDate.id, error: 'Unknown error' })
          }
        }
      } else {
        // Single-day or legacy: create one form per assignment (no event_date_id)
        const comboKey = `${assignment.id}:null`
        if (existingCombos.has(comboKey)) {
          skippedCount++
          continue
        }

        try {
          const result = await createFormAndTask({
            supabase,
            dataSourceTenantId,
            sessionUserId: session.user.id,
            event,
            eventDate: eventDates[0] || null,
            assignment,
            user,
            template,
            legacyMode: true, // Don't set event_date_id
          })

          if (result.error) {
            errors.push({ assignment_id: assignment.id, event_date_id: null, error: result.error })
          } else {
            createdForms.push({
              id: result.formId!,
              public_id: result.publicId!,
              task_id: result.taskId,
              event_date_id: null,
            })
          }
        } catch (err) {
          log.error({ error: err, assignmentId: assignment.id }, 'Error processing')
          errors.push({ assignment_id: assignment.id, event_date_id: null, error: 'Unknown error' })
        }
      }
    }

    log.info(
      { eventId: body.event_id, created: createdForms.length, errors: errors.length, skipped: skippedCount, isMultiDay },
      'Staff forms sent'
    )

    return NextResponse.json({
      success: true,
      created: createdForms.length,
      forms: createdForms,
      errors: errors.length > 0 ? errors : undefined,
      skipped: skippedCount,
      isMultiDay,
    })
  } catch (error) {
    log.error({ error }, 'Staff forms send error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper to create a form and task for a staff assignment
 */
async function createFormAndTask({
  supabase,
  dataSourceTenantId,
  sessionUserId,
  event,
  eventDate,
  assignment,
  user,
  template,
  legacyMode = false,
}: {
  supabase: any
  dataSourceTenantId: string
  sessionUserId: string
  event: { id: string; title: string; end_date: string | null }
  eventDate: EventDateInfo | null
  assignment: { id: string }
  user: { id: string; first_name: string; last_name: string; email: string }
  template: { name: string; description: string | null; fields: any }
  legacyMode?: boolean
}): Promise<{ formId?: string; publicId?: string; taskId: string | null; error?: string }> {
  const publicId = nanoid(11)
  const formUrl = `${process.env.NEXTAUTH_URL || ''}/staff-form/${publicId}`

  // Calculate task due date (24 hours after event date end or event end)
  let taskDueDate: string
  if (eventDate?.event_date && eventDate?.end_time) {
    // Use specific date + end time + 24 hours
    const dateTime = new Date(`${eventDate.event_date}T${eventDate.end_time}`)
    taskDueDate = addHours(dateTime, 24).toISOString()
  } else if (event.end_date) {
    taskDueDate = addHours(new Date(event.end_date), 24).toISOString()
  } else {
    taskDueDate = addHours(new Date(), 48).toISOString()
  }

  // Format date for task title if multi-day
  const dateLabel = eventDate?.event_date
    ? format(new Date(eventDate.event_date + 'T00:00:00'), 'MMM d')
    : ''

  const taskTitle = legacyMode || !eventDate
    ? 'Complete Post-Event Recap'
    : `Complete Post-Event Recap (${dateLabel})`

  const taskDescription = legacyMode || !eventDate
    ? `Please complete your recap form for "${event.title}".\n\nForm link: ${formUrl}`
    : `Please complete your recap form for "${event.title}" - ${dateLabel}.\n\nForm link: ${formUrl}`

  // Create the task first
  const taskData = {
    title: taskTitle,
    description: taskDescription,
    entity_type: 'event',
    entity_id: event.id,
    assigned_to: user.id,
    due_date: taskDueDate,
    task_timing: 'post_event',
    task_type: 'operations',
    status: 'pending',
  }

  const { data: task, error: taskError } = await insertWithTenantId(
    supabase,
    'tasks',
    taskData,
    dataSourceTenantId,
    sessionUserId
  )

  if (taskError) {
    log.error({ error: taskError, assignmentId: assignment.id }, 'Failed to create task')
  }

  // Create the staff form
  const formData: Record<string, any> = {
    event_id: event.id,
    staff_assignment_id: assignment.id,
    template_id: template.name ? undefined : null,  // Will be set below
    title: template.name,
    description: template.description,
    fields: template.fields,
    public_id: publicId,
    status: 'sent',
    sent_at: new Date().toISOString(),
    task_id: task?.id || null,
  }

  // Only set event_date_id for multi-day events (non-legacy mode)
  if (!legacyMode && eventDate) {
    formData.event_date_id = eventDate.id
  }

  const { data: form, error: formError } = await insertWithTenantId(
    supabase,
    'staff_forms',
    formData,
    dataSourceTenantId,
    sessionUserId
  )

  if (formError) {
    log.error({ error: formError, assignmentId: assignment.id }, 'Failed to create staff form')
    return { taskId: task?.id || null, error: formError.message }
  }

  return {
    formId: form.id,
    publicId,
    taskId: task?.id || null,
  }
}
