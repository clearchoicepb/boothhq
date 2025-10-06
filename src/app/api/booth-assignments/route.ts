import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const boothIdFilter = searchParams.get('booth_id') || 'all'
    const eventIdFilter = searchParams.get('event_id') || 'all'

    let query = supabase
      .from('booth_assignments')
      .select(`
        *,
        booth:booths!booth_assignments_booth_id_fkey(booth_name, booth_type),
        event:events!booth_assignments_event_id_fkey(title, start_date, end_date),
        checked_out_by_user:users!booth_assignments_checked_out_by_fkey(first_name, last_name),
        checked_in_by_user:users!booth_assignments_checked_in_by_fkey(first_name, last_name)
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('assigned_date', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (boothIdFilter !== 'all') {
      query = query.eq('booth_id', boothIdFilter)
    }

    if (eventIdFilter !== 'all') {
      query = query.eq('event_id', eventIdFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching booth assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch booth assignments' }, { status: 500 })
    }

    // Transform the data to include booth_name, event_name, and user names
    const transformedData = data?.map(assignment => ({
      ...assignment,
      booth_name: assignment.booth?.booth_name || null,
      booth_type: assignment.booth?.booth_type || null,
      event_name: assignment.event?.title || null,
      event_start_date: assignment.event?.start_date || null,
      event_end_date: assignment.event?.end_date || null,
      checked_out_by_name: assignment.checked_out_by_user ?
        `${assignment.checked_out_by_user.first_name} ${assignment.checked_out_by_user.last_name}`.trim() : null,
      checked_in_by_name: assignment.checked_in_by_user ?
        `${assignment.checked_in_by_user.first_name} ${assignment.checked_in_by_user.last_name}`.trim() : null
    })) || []

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('booth_assignments')
      .insert({
        ...body,
        tenant_id: session.user.tenantId,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booth assignment:', error)
      return NextResponse.json({ error: 'Failed to create booth assignment' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
