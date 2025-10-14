import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: eventId } = await params
    const supabase = createServerSupabaseClient()

    // Fetch event with related data (including old location TEXT field for fallback)
    const { data: event, error: eventError} = await supabase
      .from('events')
      .select(`
        id,
        location,
        venue_contact_name,
        venue_contact_phone,
        venue_contact_email,
        event_planner_name,
        event_planner_phone,
        event_planner_email,
        start_date,
        end_date,
        description,
        opportunity_id,
        account:accounts (
          name
        )
      `)
      .eq('id', eventId)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (eventError) throw eventError

    // Fetch event dates with location
    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .select(`
        event_date,
        start_time,
        end_time,
        notes,
        location:locations (
          name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          contact_name,
          contact_phone,
          contact_email,
          notes
        )
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', session.user.tenantId)
      .order('event_date', { ascending: true })

    if (datesError) throw datesError

    // Get first event date
    const primaryEventDate = eventDates?.[0]

    // Fetch packages and add-ons from opportunity line items
    let packages: any[] = []
    if (event.opportunity_id) {
      const { data: lineItems } = await supabase
        .from('opportunity_line_items')
        .select(`
          id,
          item_type,
          package:packages (
            id,
            name,
            category
          )
        `)
        .eq('opportunity_id', event.opportunity_id)
        .eq('tenant_id', session.user.tenantId)

      packages = lineItems?.map(item => ({
        id: item.id,
        name: item.package?.name || 'Custom Item',
        type: item.item_type
      })) || []
    }

    // Fetch custom items (backdrops, wraps, etc.)
    const { data: customItems } = await supabase
      .from('event_custom_items')
      .select('id, item_name, item_type')
      .eq('event_id', eventId)
      .eq('tenant_id', session.user.tenantId)

    // Fetch booth assignments (equipment)
    const { data: boothAssignments } = await supabase
      .from('booth_assignments')
      .select(`
        id,
        status,
        assigned_date,
        checked_out_at,
        checked_in_at,
        condition_notes,
        booth:booths (
          booth_name,
          booth_type,
          serial_number
        )
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', session.user.tenantId)
      .order('assigned_date', { ascending: true })

    // Fetch staff assignments
    console.log('[LOGISTICS-API] Fetching staff for eventId:', eventId, 'tenantId:', session.user.tenantId)
    const { data: staffAssignments, error: staffError } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        notes,
        event_date_id,
        users!event_staff_assignments_user_id_fkey (
          first_name,
          last_name,
          email
        ),
        staff_roles!event_staff_assignments_staff_role_id_fkey (
          name,
          type
        )
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: true })

    if (staffError) {
      console.error('[LOGISTICS-API] Staff query error:', staffError)
    } else {
      console.log('[LOGISTICS-API] Staff query success, found records:', staffAssignments?.length || 0)
      console.log('[LOGISTICS-API] Raw staff data:', JSON.stringify(staffAssignments, null, 2))
    }

    // Build location object - prefer event_dates location, fall back to old TEXT field
    let locationData = primaryEventDate?.location

    // If no location from event_dates and we have old TEXT location, create a simple object
    if (!locationData && event.location) {
      locationData = {
        name: event.location,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        notes: null
      }
    }

    // Build logistics object
    const staffArray = staffAssignments?.map(sa => ({
      id: sa.id,
      name: sa.users ? `${sa.users.first_name} ${sa.users.last_name}`.trim() : 'Unknown',
      email: sa.users?.email,
      role: sa.staff_roles?.name,
      role_type: sa.staff_roles?.type,
      notes: sa.notes,
      is_event_day: !!sa.event_date_id
    })) || []

    console.log('[LOGISTICS-API] Transformed staff array:', JSON.stringify(staffArray, null, 2))

    const logistics = {
      client_name: event.account?.name,
      event_date: primaryEventDate?.event_date,
      start_time: primaryEventDate?.start_time ||
        (event.start_date ? new Date(event.start_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : undefined),
      end_time: primaryEventDate?.end_time ||
        (event.end_date ? new Date(event.end_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : undefined),
      location: locationData,
      venue_contact_name: event.venue_contact_name,
      venue_contact_phone: event.venue_contact_phone,
      venue_contact_email: event.venue_contact_email,
      event_planner_name: event.event_planner_name,
      event_planner_phone: event.event_planner_phone,
      event_planner_email: event.event_planner_email,
      event_notes: event.description || primaryEventDate?.notes,
      packages,
      custom_items: customItems || [],
      equipment: boothAssignments?.map(ba => ({
        id: ba.id,
        name: ba.booth?.booth_name,
        type: ba.booth?.booth_type,
        serial_number: ba.booth?.serial_number,
        status: ba.status,
        checked_out_at: ba.checked_out_at,
        checked_in_at: ba.checked_in_at,
        condition_notes: ba.condition_notes
      })) || [],
      staff: staffArray
    }

    return NextResponse.json({ logistics })
  } catch (error: any) {
    console.error('Error fetching event logistics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
