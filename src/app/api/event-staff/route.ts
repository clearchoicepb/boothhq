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
    console.log('[EVENT-STAFF-POST] ========== START POST REQUEST ==========')
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      console.log('[EVENT-STAFF-POST] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[EVENT-STAFF-POST] User authenticated:', session.user.email, 'Tenant:', session.user.tenantId)

    const body = await request.json()
    console.log('[EVENT-STAFF-POST] Request body received:', JSON.stringify(body, null, 2))

    const supabase = createServerSupabaseClient()

    const staffData = {
      ...body,
      tenant_id: session.user.tenantId
    }

    console.log('[EVENT-STAFF-POST] Data to insert:', JSON.stringify(staffData, null, 2))
    console.log('[EVENT-STAFF-POST] Calling Supabase insert...')

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
      console.error('[EVENT-STAFF-POST] ❌ INSERT FAILED')
      console.error('[EVENT-STAFF-POST] Error:', JSON.stringify(error, null, 2))
      console.error('[EVENT-STAFF-POST] Staff data attempted:', JSON.stringify(staffData, null, 2))
      return NextResponse.json({
        error: 'Failed to create event staff assignment',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    console.log('[EVENT-STAFF-POST] ✅ INSERT SUCCESSFUL')
    console.log('[EVENT-STAFF-POST] Inserted data:', JSON.stringify(data, null, 2))
    console.log('[EVENT-STAFF-POST] ========== END POST REQUEST ==========')
    return NextResponse.json(data)
  } catch (error) {
    console.error('[EVENT-STAFF-POST] ❌ EXCEPTION CAUGHT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
