import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, updateWithTenantId, deleteWithTenantId } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { StaffFormUpdate } from '@/types/staff-forms'

const log = createLogger('api:staff-forms')

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/staff-forms/[id]
 * Get a single staff form by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

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
        event:events!staff_forms_event_id_fkey (
          id,
          title,
          start_date,
          end_date
        ),
        template:event_form_templates!staff_forms_template_id_fkey (
          id,
          name
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Staff form not found' }, { status: 404 })
      }
      log.error({ error, id }, 'Failed to fetch staff form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Staff form GET error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/staff-forms/[id]
 * Update a staff form
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const body: StaffFormUpdate = await request.json()

    const { data, error } = await updateWithTenantId(
      supabase,
      'staff_forms',
      id,
      body,
      dataSourceTenantId,
      session.user.id
    )

    if (error) {
      log.error({ error, id, body }, 'Failed to update staff form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    log.info({ staffFormId: id }, 'Staff form updated')
    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Staff form PATCH error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/staff-forms/[id]
 * Delete a staff form
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    const { error } = await deleteWithTenantId(
      supabase,
      'staff_forms',
      id,
      dataSourceTenantId
    )

    if (error) {
      log.error({ error, id }, 'Failed to delete staff form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    log.info({ staffFormId: id }, 'Staff form deleted')
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Staff form DELETE error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
