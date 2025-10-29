import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const boothId = params.id

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('booths')
      .select(`
        *,
        assigned_event:events!booths_assigned_to_event_id_fkey(title, start_date, end_date),
        assigned_user:users!booths_assigned_to_user_id_fkey(first_name, last_name)
      `)
      .eq('id', boothId)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching booth:', error)
      return NextResponse.json({ error: 'Failed to fetch booth' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Booth not found' }, { status: 404 })
    }

    // Transform the data to include assigned_event_name and assigned_user_name
    const transformedData = {
      ...data,
      assigned_event_name: data.assigned_event?.title || null,
      assigned_event_start: data.assigned_event?.start_date || null,
      assigned_event_end: data.assigned_event?.end_date || null,
      assigned_user_name: data.assigned_user ?
        `${data.assigned_user.first_name} ${data.assigned_user.last_name}`.trim() : null
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
    const boothId = params.id
    const body = await request.json()
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('booths')
      .update(body)
      .eq('id', boothId)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating booth:', error)
      return NextResponse.json({ error: 'Failed to update booth' }, { status: 500 })
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
    const boothId = params.id
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error } = await supabase
      .from('booths')
      .delete()
      .eq('id', boothId)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting booth:', error)
      return NextResponse.json({ error: 'Failed to delete booth' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
