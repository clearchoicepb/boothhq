import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events:logistics')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id: eventId } = await params

    // Get optional event_date_id from query params for multi-date support
    const searchParams = request.nextUrl.searchParams
    const eventDateId = searchParams.get('event_date_id')

    // Fetch event with related data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_type,
        location,
        load_in_notes,
        onsite_contact_name,
        onsite_contact_phone,
        event_planner_name,
        event_planner_phone,
        start_date,
        end_date,
        description,
        primary_contact_id,
        account_id,
        account:accounts (
          id,
          name
        )
      `)
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError) throw eventError

    // Fetch primary contact if exists
    let clientContact: { name: string; phone: string | null } | null = null
    if (event.primary_contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('first_name, last_name, phone')
        .eq('id', event.primary_contact_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (contact) {
        clientContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          phone: contact.phone
        }
      }
    }

    // If no primary contact, try to get first contact from account
    if (!clientContact && event.account_id) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('first_name, last_name, phone')
        .eq('account_id', event.account_id)
        .eq('tenant_id', dataSourceTenantId)
        .limit(1)

      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        clientContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          phone: contact.phone
        }
      }
    }

    // Fetch event dates with location - filter by event_date_id if provided
    let eventDatesQuery = supabase
      .from('event_dates')
      .select(`
        id,
        event_date,
        setup_time,
        start_time,
        end_time,
        notes,
        location_id,
        location:locations (
          id,
          name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          contact_name,
          contact_phone,
          notes
        )
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)

    if (eventDateId) {
      eventDatesQuery = eventDatesQuery.eq('id', eventDateId)
    }

    const { data: eventDates, error: datesError } = await eventDatesQuery
      .order('event_date', { ascending: true })

    if (datesError) throw datesError

    // Get the specific or first event date
    const targetEventDate = eventDates?.[0]

    // Fetch packages and add-ons from INVOICES (not opportunities)
    // Get all invoices for this event, then get their line items
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)

    let packages: { id: string; name: string; description?: string }[] = []
    let addOns: { id: string; name: string; description?: string }[] = []

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map(inv => inv.id)

      const { data: lineItems } = await supabase
        .from('invoice_line_items')
        .select('id, name, description, item_type')
        .in('invoice_id', invoiceIds)
        .neq('item_type', 'discount') // Exclude discounts
        .order('sort_order', { ascending: true })

      if (lineItems) {
        // Separate packages from add-ons
        packages = lineItems
          .filter(item => item.item_type === 'package')
          .map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || undefined
          }))

        addOns = lineItems
          .filter(item => item.item_type === 'add_on' || item.item_type === 'custom')
          .map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || undefined
          }))
      }
    }

    // Fetch booth assignments (equipment)
    const { data: boothAssignments } = await supabase
      .from('booth_assignments')
      .select(`
        id,
        status,
        booth:booths (
          booth_name,
          booth_type,
          serial_number
        )
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .order('assigned_date', { ascending: true })

    // Fetch staff assignments - exclude Graphic Designers
    // Include arrival_time, start_time, and end_time for staff schedule display
    const { data: staffAssignments, error: staffError } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        notes,
        event_date_id,
        arrival_time,
        start_time,
        end_time,
        users!event_staff_assignments_user_id_fkey (
          first_name,
          last_name,
          email,
          phone
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
    }

    // Build location object - prefer event_dates location, fall back to old TEXT field
    const eventDateLocation = targetEventDate?.location as unknown
    let locationData: {
      id?: string
      name: string | null
      address_line1: string | null
      address_line2: string | null
      city: string | null
      state: string | null
      postal_code: string | null
      country: string | null
      contact_name: string | null
      contact_phone: string | null
      contact_email: string | null
      notes: string | null
    } | null = Array.isArray(eventDateLocation) ? eventDateLocation[0] : eventDateLocation as typeof locationData

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

    // Process staff - filter out Graphic Designers
    const eventStaff: Array<{
      id: string
      name: string
      phone: string | null
      role: string | null
      role_type: string | null
      arrival_time: string | null
      start_time: string | null
      end_time: string | null
    }> = []

    const eventManagers: Array<{
      id: string
      name: string
      phone: string | null
      role: string | null
      arrival_time: string | null
      start_time: string | null
      end_time: string | null
    }> = []

    // Legacy staff array for PDF generator
    const legacyStaff: Array<{
      id: string
      name: string
      email?: string
      phone?: string | null
      role?: string
      role_type?: string
      notes?: string
      is_event_day: boolean
      arrival_time?: string | null
      start_time?: string | null
      end_time?: string | null
    }> = []

    staffAssignments?.forEach(sa => {
      const usersData = sa.users as unknown
      const user = Array.isArray(usersData) ? usersData[0] : usersData as {
        first_name: string
        last_name: string
        email: string
        phone: string | null
      } | null

      const rolesData = sa.staff_roles as unknown
      const staffRole = Array.isArray(rolesData) ? rolesData[0] : rolesData as {
        name: string
        type: string
      } | null

      // Skip Graphic Designers
      const roleName = staffRole?.name?.toLowerCase() || ''
      if (roleName.includes('graphic') || roleName.includes('designer')) {
        return
      }

      const staffMember = {
        id: sa.id,
        name: user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown',
        phone: user?.phone || null,
        role: staffRole?.name || null,
        role_type: staffRole?.type || null,
        arrival_time: sa.arrival_time || null,
        start_time: sa.start_time || null,
        end_time: sa.end_time || null
      }

      // Categorize: operations type or "Manager" in name = Event Manager
      if (staffRole?.type === 'operations' || roleName.includes('manager')) {
        eventManagers.push(staffMember)
      } else if (staffRole?.type === 'event_staff') {
        eventStaff.push(staffMember)
      }

      // Add to legacy array for PDF generator
      legacyStaff.push({
        id: sa.id,
        name: staffMember.name,
        email: user?.email,
        phone: user?.phone,
        role: staffRole?.name,
        role_type: staffRole?.type,
        notes: sa.notes || undefined,
        is_event_day: staffRole?.type === 'event_staff',
        arrival_time: sa.arrival_time,
        start_time: sa.start_time,
        end_time: sa.end_time
      })
    })

    // Process equipment
    const equipment = boothAssignments?.map(ba => {
      const boothData = ba.booth as unknown
      const booth = Array.isArray(boothData) ? boothData[0] : boothData as {
        booth_name: string
        booth_type: string
        serial_number: string
      } | null

      return {
        id: ba.id,
        name: booth?.booth_name || 'Unknown Booth',
        type: booth?.booth_type || null,
        serial_number: booth?.serial_number || null
      }
    }) || []

    // Get account name
    const accountData = event.account as unknown
    const account = Array.isArray(accountData) ? accountData[0] : accountData as { id: string; name: string } | null

    // Build logistics response object
    const logistics = {
      // Section 1: Header
      event_title: event.title,
      event_type: event.event_type,
      client_name: account?.name || null,
      client_contact: clientContact,

      // Section 2: Schedule
      event_date: targetEventDate?.event_date || null,
      event_date_id: targetEventDate?.id || null,
      setup_time: targetEventDate?.setup_time || null,
      start_time: targetEventDate?.start_time ||
        (event.start_date ? new Date(event.start_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : null),
      end_time: targetEventDate?.end_time ||
        (event.end_date ? new Date(event.end_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : null),

      // Section 3: Location
      location: locationData,

      // Section 4: Contacts
      onsite_contact: {
        name: event.onsite_contact_name || null,
        phone: event.onsite_contact_phone || null
      },
      venue_contact: {
        name: locationData?.contact_name || null,
        phone: locationData?.contact_phone || null
      },
      event_planner: {
        name: event.event_planner_name || null,
        phone: event.event_planner_phone || null
      },

      // Section 5: Arrival Instructions
      load_in_notes: event.load_in_notes || null,
      parking_instructions: locationData?.notes || null,

      // Section 6: Event Scope
      packages,
      add_ons: addOns,
      equipment,

      // Section 7: Staff
      event_staff: eventStaff,
      event_managers: eventManagers,

      // Section 8: Notes
      event_notes: event.description || targetEventDate?.notes || null,

      // Multi-date info
      all_event_dates: eventDates?.map(ed => ({
        id: ed.id,
        event_date: ed.event_date
      })) || [],

      // ===== Legacy fields for PDF generator compatibility =====
      load_in_time: targetEventDate?.setup_time || null,
      // Onsite contact (from event record)
      onsite_contact_name: event.onsite_contact_name || null,
      onsite_contact_phone: event.onsite_contact_phone || null,
      onsite_contact_email: null,
      // Venue contact (from location record)
      venue_contact_name: locationData?.contact_name || null,
      venue_contact_phone: locationData?.contact_phone || null,
      venue_contact_email: locationData?.contact_email || null,
      // Event planner
      event_planner_name: event.event_planner_name || null,
      event_planner_phone: event.event_planner_phone || null,
      event_planner_email: null,
      staff: legacyStaff,
      custom_items: addOns.map(addon => ({
        id: addon.id,
        item_name: addon.name,
        item_type: 'add_on'
      }))
    }

    return NextResponse.json({ logistics })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ error }, 'Error fetching event logistics')
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
