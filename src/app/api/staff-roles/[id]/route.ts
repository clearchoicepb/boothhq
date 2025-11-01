import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const params = await routeContext.params
    const roleId = params.id
    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('staff_roles')
      .update(updateData)
      .eq('id', roleId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating staff role:', error)
      return NextResponse.json({ error: 'Failed to update staff role', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
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

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const params = await routeContext.params
    const roleId = params.id
    // Check if this role is being used in any staff assignments
    const { data: assignments, error: checkError } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('staff_role_id', roleId)
      .limit(1)

    if (checkError) {
      console.error('Error checking role usage:', checkError)
      return NextResponse.json({ error: 'Failed to check role usage' }, { status: 500 })
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete role that is currently assigned to staff members'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('staff_roles')
      .delete()
      .eq('id', roleId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting staff role:', error)
      return NextResponse.json({ error: 'Failed to delete staff role', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
