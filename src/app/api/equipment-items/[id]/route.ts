import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await context.params
    const itemId = params.id

    const { data, error } = await supabase
      .from('equipment_items')
      .select(`
        *,
        booths!equipment_items_booth_id_fkey(booth_name, booth_type),
        assigned_to_user:users!equipment_items_assigned_to_user_id_fkey(first_name, last_name),
        assigned_to_event:events!equipment_items_assigned_to_event_id_fkey(title, start_date, end_date)
      `)
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      console.error('Error fetching equipment item:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment item' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Equipment item not found' }, { status: 404 })
    }

    // Transform the data to include booth_name, assigned_user_name, and assigned_event_name
    const transformedData = {
      ...data,
      booth_name: data.booths?.booth_name || null,
      booth_type: data.booths?.booth_type || null,
      assigned_user_name: data.assigned_to_user ?
        `${data.assigned_to_user.first_name} ${data.assigned_to_user.last_name}`.trim() : null,
      assigned_event_name: data.assigned_to_event?.title || null,
      assigned_event_start_date: data.assigned_to_event?.start_date || null,
      assigned_event_end_date: data.assigned_to_event?.end_date || null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const itemId = params.id
    const body = await request.json()
    const { data, error } = await supabase
      .from('equipment_items')
      .update(body)
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment item:', error)
      return NextResponse.json({ error: 'Failed to update equipment item' }, { status: 500 })
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
    const itemId = params.id
    const { error } = await supabase
      .from('equipment_items')
      .delete()
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting equipment item:', error)
      return NextResponse.json({ error: 'Failed to delete equipment item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
