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
    const boothTypeFilter = searchParams.get('booth_type') || 'all'
    const isActiveFilter = searchParams.get('is_active') || 'all'

    let query = supabase
      .from('booths')
      .select(`
        *,
        assigned_event:events!booths_assigned_to_event_id_fkey(title, start_date, end_date),
        assigned_user:users!booths_assigned_to_user_id_fkey(first_name, last_name)
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('booth_name', { ascending: true })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (boothTypeFilter !== 'all') {
      query = query.eq('booth_type', boothTypeFilter)
    }

    if (isActiveFilter !== 'all') {
      query = query.eq('is_active', isActiveFilter === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching booths:', error)
      return NextResponse.json({ error: 'Failed to fetch booths' }, { status: 500 })
    }

    // Transform the data to include assigned_event_name and assigned_user_name
    const transformedData = data?.map(booth => ({
      ...booth,
      assigned_event_name: booth.assigned_event?.title || null,
      assigned_event_start: booth.assigned_event?.start_date || null,
      assigned_event_end: booth.assigned_event?.end_date || null,
      assigned_user_name: booth.assigned_user ?
        `${booth.assigned_user.first_name} ${booth.assigned_user.last_name}`.trim() : null
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
      .from('booths')
      .insert({
        ...body,
        tenant_id: session.user.tenantId,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booth:', error)
      return NextResponse.json({ error: 'Failed to create booth' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
