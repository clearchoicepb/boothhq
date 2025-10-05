import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const staffAssignmentId = params.id
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const updateData: any = {}

    if (body.staff_role_id !== undefined) updateData.staff_role_id = body.staff_role_id
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.notes !== undefined) updateData.notes = body.notes

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('event_staff_assignments')
      .update(updateData)
      .eq('id', staffAssignmentId)
      .eq('tenant_id', session.user.tenantId)
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
      console.error('Error updating event staff assignment:', error)
      return NextResponse.json({
        error: 'Failed to update event staff assignment',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const staffAssignmentId = params.id
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('event_staff_assignments')
      .delete()
      .eq('id', staffAssignmentId)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting event staff assignment:', error)
      return NextResponse.json({
        error: 'Failed to delete event staff assignment',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
