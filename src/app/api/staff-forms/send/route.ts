import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, insertWithTenantId } from '@/lib/tenant-helpers'
import { nanoid } from 'nanoid'
import { addHours } from 'date-fns'
import { createLogger } from '@/lib/logger'
import type { SendStaffFormsRequest } from '@/types/staff-forms'

const log = createLogger('api:staff-forms:send')

/**
 * POST /api/staff-forms/send
 * Send staff forms to selected staff members
 * Creates forms + tasks for each staff assignment
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
    const { data: existingForms } = await supabase
      .from('staff_forms')
      .select('staff_assignment_id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', body.event_id)
      .in('staff_assignment_id', body.staff_assignment_ids)

    const existingAssignmentIds = new Set(existingForms?.map(f => f.staff_assignment_id) || [])
    const newAssignments = assignments?.filter(a => !existingAssignmentIds.has(a.id)) || []

    if (newAssignments.length === 0) {
      return NextResponse.json(
        { error: 'All selected staff already have forms for this event', created: 0 },
        { status: 409 }
      )
    }

    // Calculate task due date (24 hours after event end)
    const taskDueDate = event.end_date
      ? addHours(new Date(event.end_date), 24).toISOString()
      : addHours(new Date(), 48).toISOString() // Default 48 hours from now

    const createdForms: { id: string; public_id: string; task_id: string | null }[] = []
    const errors: { assignment_id: string; error: string }[] = []

    // Create forms and tasks for each assignment
    for (const assignment of newAssignments) {
      try {
        const publicId = nanoid(11)
        const formUrl = `${process.env.NEXTAUTH_URL || ''}/staff-form/${publicId}`
        const user = assignment.users as { id: string; first_name: string; last_name: string; email: string }

        // Create the task first
        const taskData = {
          title: 'Complete Post-Event Recap',
          description: `Please complete your recap form for "${event.title}".\n\nForm link: ${formUrl}`,
          entity_type: 'event',
          entity_id: body.event_id,
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
          session.user.id
        )

        if (taskError) {
          log.error({ error: taskError, assignmentId: assignment.id }, 'Failed to create task')
        }

        // Create the staff form
        const formData = {
          event_id: body.event_id,
          staff_assignment_id: assignment.id,
          template_id: body.template_id,
          title: template.name,
          description: template.description,
          fields: template.fields,
          public_id: publicId,
          status: 'sent',
          sent_at: new Date().toISOString(),
          task_id: task?.id || null,
        }

        const { data: form, error: formError } = await insertWithTenantId(
          supabase,
          'staff_forms',
          formData,
          dataSourceTenantId,
          session.user.id
        )

        if (formError) {
          log.error({ error: formError, assignmentId: assignment.id }, 'Failed to create staff form')
          errors.push({ assignment_id: assignment.id, error: formError.message })
        } else {
          createdForms.push({
            id: form.id,
            public_id: publicId,
            task_id: task?.id || null,
          })
        }
      } catch (err) {
        log.error({ error: err, assignmentId: assignment.id }, 'Error processing staff assignment')
        errors.push({ assignment_id: assignment.id, error: 'Unknown error' })
      }
    }

    log.info(
      { eventId: body.event_id, created: createdForms.length, errors: errors.length },
      'Staff forms sent'
    )

    return NextResponse.json({
      success: true,
      created: createdForms.length,
      forms: createdForms,
      errors: errors.length > 0 ? errors : undefined,
      skipped: existingAssignmentIds.size,
    })
  } catch (error) {
    log.error({ error }, 'Staff forms send error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
