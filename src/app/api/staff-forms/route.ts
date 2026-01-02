import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, insertWithTenantId } from '@/lib/tenant-helpers'
import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logger'
import type { StaffForm, StaffFormInsert } from '@/types/staff-forms'

const log = createLogger('api:staff-forms')

/**
 * GET /api/staff-forms
 * List staff forms for an event
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'event_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('staff_forms')
      .select(`
        *,
        staff_assignment:event_staff_assignments!staff_forms_staff_assignment_id_fkey (
          id,
          user_id,
          users:user_id (
            id,
            first_name,
            last_name,
            email
          ),
          staff_roles:staff_role_id (
            id,
            name
          )
        ),
        event_date:event_dates (
          id,
          event_date,
          start_time,
          end_time,
          location:locations (
            id,
            name
          )
        ),
        template:event_form_templates!staff_forms_template_id_fkey (
          id,
          name
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ error, eventId }, 'Failed to fetch staff forms')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Staff forms GET error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff-forms
 * Create a new staff form for a specific staff assignment
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body: StaffFormInsert = await request.json()

    // Validate required fields
    if (!body.event_id || !body.staff_assignment_id || !body.title || !body.fields) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, staff_assignment_id, title, fields' },
        { status: 400 }
      )
    }

    // Check if form already exists for this staff assignment + date combination
    // For multi-day events, we check by (staff_assignment_id, event_date_id)
    // For legacy single-date events, we check by (staff_assignment_id, event_id) where event_date_id is null
    let existingFormQuery = supabase
      .from('staff_forms')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('staff_assignment_id', body.staff_assignment_id)

    if (body.event_date_id) {
      existingFormQuery = existingFormQuery.eq('event_date_id', body.event_date_id)
    } else {
      existingFormQuery = existingFormQuery
        .eq('event_id', body.event_id)
        .is('event_date_id', null)
    }

    const { data: existingForm } = await existingFormQuery.single()

    if (existingForm) {
      return NextResponse.json(
        { error: 'A form already exists for this staff member on this event date' },
        { status: 409 }
      )
    }

    // Generate public ID
    const publicId = nanoid(11)

    const insertData = {
      event_id: body.event_id,
      event_date_id: body.event_date_id || null,
      staff_assignment_id: body.staff_assignment_id,
      template_id: body.template_id || null,
      title: body.title,
      description: body.description || null,
      fields: body.fields,
      public_id: publicId,
      status: body.status || 'pending',
    }

    const { data, error } = await insertWithTenantId(
      supabase,
      'staff_forms',
      insertData,
      dataSourceTenantId,
      session.user.id
    )

    if (error) {
      log.error({ error, body }, 'Failed to create staff form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    log.info({ staffFormId: data.id, eventId: body.event_id }, 'Staff form created')
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Staff forms POST error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
