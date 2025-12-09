import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { id: eventId } = await params
    // Fetch event with related data (including old location TEXT field for fallback)
    const { data: event, error: eventError} = await supabase
      .from('events')
      .select(`
        id,
        location,
        load_in_time,
        load_in_notes,
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
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError) throw eventError

    // Fetch event dates with location
    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .select(`
        event_date,
        setup_time,
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
      .eq('tenant_id', dataSourceTenantId)
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
        .eq('tenant_id', dataSourceTenantId)

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
      .eq('tenant_id', dataSourceTenantId)

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
      .eq('tenant_id', dataSourceTenantId)
      .order('assigned_date', { ascending: true })

    // Fetch staff assignments
    log.debug({ eventId, tenantId: session.user.tenantId }, 'Fetching staff')
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
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: true })

    if (staffError) {
      log.error({ staffError }, '[LOGISTICS-API] Staff query error')
    } else {
      log.debug({ count: staffAssignments?.length || 0 }, 'Staff query success, found records')
      log.debug({ staffAssignments }, 'Raw staff data')
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

    log.debug({ staffArray }, 'Transformed staff array')

    const logistics = {
      client_name: event.account?.name,
      event_date: primaryEventDate?.event_date,
      load_in_time: event.load_in_time,
      load_in_notes: event.load_in_notes,
      setup_time: primaryEventDate?.setup_time,
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
    log.error({ error }, 'Error fetching event logistics')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
