import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-staff')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const eventDateId = searchParams.get('event_date_id')

    log.debug({ tenantId: dataSourceTenantId, eventId }, 'Starting query for tenant')

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
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (eventDateId) {
      query = query.eq('event_date_id', eventDateId)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, '[EVENT-STAFF-GET] Supabase error')
      return NextResponse.json({
        error: 'Failed to fetch event staff',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    log.debug({ recordCount: data?.length || 0 }, 'Success, found records')
    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, '[EVENT-STAFF-GET] Caught exception')
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    log.debug({}, '========== START POST REQUEST ==========')
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      log.debug({}, 'Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    log.debug({ email: session.user.email, tenantId: dataSourceTenantId }, 'User authenticated')

    const body = await request.json()
    log.debug({ body }, 'Request body received')

    const staffData = {
      ...body,
      tenant_id: dataSourceTenantId
    }

    log.debug({ staffData }, 'Data to insert')
    log.debug({}, 'Calling Supabase insert...')

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
      log.error({}, '[EVENT-STAFF-POST] ❌ INSERT FAILED')
      log.error({ error }, '[EVENT-STAFF-POST] Error')
      log.error({ staffData }, '[EVENT-STAFF-POST] Staff data attempted')
      return NextResponse.json({
        error: 'Failed to create event staff assignment',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    log.debug({}, '✅ INSERT SUCCESSFUL')
    log.debug({ data }, 'Inserted data')
    log.debug({}, '========== END POST REQUEST ==========')
    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, '[EVENT-STAFF-POST] ❌ EXCEPTION CAUGHT')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
