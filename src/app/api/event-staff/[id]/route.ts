import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-staff')
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const staffAssignmentId = params.id
    const body = await request.json()
    const updateData: any = {}

    if (body.staff_role_id !== undefined) updateData.staff_role_id = body.staff_role_id
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.arrival_time !== undefined) updateData.arrival_time = body.arrival_time
    if (body.pay_type_override !== undefined) updateData.pay_type_override = body.pay_type_override
    if (body.flat_rate_amount !== undefined) updateData.flat_rate_amount = body.flat_rate_amount

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('event_staff_assignments')
      .update(updateData)
      .eq('id', staffAssignmentId)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        users!event_staff_assignments_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          role
        ),
        event_dates!event_staff_assignments_event_date_id_fkey (
          id,
          event_date,
          start_time,
          end_time
        ),
        staff_roles!event_staff_assignments_staff_role_id_fkey (
          id,
          name,
          type
        )
      `)
      .single()

    if (error) {
      log.error({ error }, 'Error updating event staff assignment')
      return NextResponse.json({
        error: 'Failed to update event staff assignment',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const staffAssignmentId = params.id
    const { error } = await supabase
      .from('event_staff_assignments')
      .delete()
      .eq('id', staffAssignmentId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting event staff assignment')
      return NextResponse.json({
        error: 'Failed to delete event staff assignment',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
