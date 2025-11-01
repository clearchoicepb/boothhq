import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const assignmentId = params.id

    const { data, error } = await supabase
      .from('booth_assignments')
      .select(`
        *,
        booth:booths!booth_assignments_booth_id_fkey(booth_name, booth_type),
        event:events!booth_assignments_event_id_fkey(title, start_date, end_date),
        checked_out_by_user:users!booth_assignments_checked_out_by_fkey(first_name, last_name),
        checked_in_by_user:users!booth_assignments_checked_in_by_fkey(first_name, last_name)
      `)
      .eq('id', assignmentId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      console.error('Error fetching booth assignment:', error)
      return NextResponse.json({ error: 'Failed to fetch booth assignment' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Booth assignment not found' }, { status: 404 })
    }

    // Transform the data to include booth_name, event_name, and user names
    const transformedData = {
      ...data,
      booth_name: data.booth?.booth_name || null,
      booth_type: data.booth?.booth_type || null,
      event_name: data.event?.title || null,
      event_start_date: data.event?.start_date || null,
      event_end_date: data.event?.end_date || null,
      checked_out_by_name: data.checked_out_by_user ?
        `${data.checked_out_by_user.first_name} ${data.checked_out_by_user.last_name}`.trim() : null,
      checked_in_by_name: data.checked_in_by_user ?
        `${data.checked_in_by_user.first_name} ${data.checked_in_by_user.last_name}`.trim() : null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const assignmentId = params.id
    const body = await request.json()
    const { data, error } = await supabase
      .from('booth_assignments')
      .update(body)
      .eq('id', assignmentId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating booth assignment:', error)
      return NextResponse.json({ error: 'Failed to update booth assignment' }, { status: 500 })
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
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const assignmentId = params.id
    const { error } = await supabase
      .from('booth_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting booth assignment:', error)
      return NextResponse.json({ error: 'Failed to delete booth assignment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
