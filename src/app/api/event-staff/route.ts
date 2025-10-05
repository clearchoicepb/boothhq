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
    const eventId = searchParams.get('event_id')
    const eventDateId = searchParams.get('event_date_id')

    console.log('[EVENT-STAFF-GET] Starting query for tenant:', session.user.tenantId, 'eventId:', eventId)

    let query = supabase
      .from('event_staff_assignments')
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
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (eventDateId) {
      query = query.eq('event_date_id', eventDateId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[EVENT-STAFF-GET] Supabase error:', JSON.stringify(error, null, 2))
      return NextResponse.json({
        error: 'Failed to fetch event staff',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    console.log('[EVENT-STAFF-GET] Success, found', data?.length || 0, 'records')
    return NextResponse.json(data)
  } catch (error) {
    console.error('[EVENT-STAFF-GET] Caught exception:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
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

    const staffData = {
      ...body,
      tenant_id: session.user.tenantId
    }

    const { data, error } = await supabase
      .from('event_staff_assignments')
      .insert(staffData)
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
      console.error('Error creating event staff assignment:', error)
      console.error('Staff data attempted:', staffData)
      return NextResponse.json({
        error: 'Failed to create event staff assignment',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
