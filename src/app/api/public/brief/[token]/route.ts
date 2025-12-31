import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:brief')

// Tenant Data DB client for public access (business data)
async function getPublicSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.DEFAULT_TENANT_DATA_URL!
  const serviceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// App DB client for querying tenants table
async function getAppSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

interface LocationData {
  id: string
  name: string
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
}

interface EventDateData {
  id: string
  event_date: string
  setup_time: string | null
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
  location: LocationData | null
}

interface UserData {
  first_name: string
  last_name: string
  phone: string | null
}

interface RoleData {
  name: string
  type: string
}

interface StaffAssignment {
  id: string
  arrival_time: string | null
  start_time: string | null
  end_time: string | null
  users: UserData | null
  staff_roles: RoleData | null
}

interface LineItem {
  id: string
  name: string
  description: string | null
  item_type: string
}

/**
 * GET /api/public/brief/[token]
 * Get event data for staff brief page (no auth required)
 * This is the staff-facing version of the public event page
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ token: string }> }
) {
  try {
    const params = await routeContext.params
    const { token } = params

    // Validate token format (64-character hex)
    if (!token || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid staff brief token' }, { status: 400 })
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch event by staff_brief_token
    log.info({ token: token.substring(0, 8) + '...' }, 'Looking up event by staff brief token')

    // Fetch event with related data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        tenant_id,
        title,
        event_type,
        description,
        status,
        start_date,
        end_date,
        location,
        location_id,
        staff_brief_enabled,
        account_id,
        contact_id,
        primary_contact_id,
        onsite_contact_name,
        onsite_contact_phone,
        onsite_contact_email,
        event_planner_id,
        event_planner_name,
        event_planner_phone,
        event_planner_email,
        load_in_notes,
        dress_code,
        account:accounts (
          id,
          name,
          phone,
          email
        )
      `)
      .eq('staff_brief_token', token)
      .single()

    if (eventError) {
      log.error({ error: eventError, code: eventError.code, message: eventError.message }, 'Staff brief query failed')
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event) {
      log.error({ token: token.substring(0, 8) + '...' }, 'No event found with this staff brief token')
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    log.info({ eventId: event.id }, 'Event found for staff brief')

    // Check if staff brief is enabled
    if (!event.staff_brief_enabled) {
      return NextResponse.json({ error: 'Staff brief access disabled for this event' }, { status: 403 })
    }

    // Fetch tenant branding (logo)
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', event.tenant_id)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    const logoUrl = logoSetting?.setting_value || null

    // Fetch primary contact
    let primaryContact: {
      name: string
      email: string | null
      phone: string | null
    } | null = null

    if (event.primary_contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, phone')
        .eq('id', event.primary_contact_id)
        .single()

      if (contact) {
        primaryContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          email: contact.email,
          phone: contact.phone
        }
      }
    }

    // If no primary contact, try contact_id
    if (!primaryContact && event.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, phone')
        .eq('id', event.contact_id)
        .single()

      if (contact) {
        primaryContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          email: contact.email,
          phone: contact.phone
        }
      }
    }

    // Fetch event planner contact (if linked to a contact record)
    let eventPlannerContact: {
      name: string
      email: string | null
      phone: string | null
      company: string | null
    } | null = null

    if (event.event_planner_id) {
      const { data: planner } = await supabase
        .from('contacts')
        .select(`
          first_name,
          last_name,
          email,
          phone,
          mobile,
          account:accounts (
            name
          )
        `)
        .eq('id', event.event_planner_id)
        .single()

      if (planner) {
        const accountData = planner.account as unknown
        const account = Array.isArray(accountData) ? accountData[0] : accountData as { name: string } | null

        eventPlannerContact = {
          name: `${planner.first_name} ${planner.last_name}`.trim(),
          email: planner.email,
          phone: planner.phone || planner.mobile,
          company: account?.name || null
        }
      }
    }

    // Fetch event dates with location info (including venue contact)
    const { data: eventDates } = await supabase
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
          contact_email,
          notes
        )
      `)
      .eq('event_id', event.id)
      .order('event_date', { ascending: true })

    // Process event dates and get venue info
    let venue: {
      name: string | null
      address: string | null
      googleMapsUrl: string | null
    } | null = null

    // Venue contact info (from location record - the venue's employee/coordinator)
    let venueContactName: string | null = null
    let venueContactPhone: string | null = null
    let venueContactEmail: string | null = null

    const formattedDates = (eventDates || []).map((ed: any) => {
      const locationData = ed.location as unknown
      const loc = Array.isArray(locationData) ? locationData[0] : locationData as LocationData | null

      // Get venue and location contact from first event date with location
      if (!venue && loc) {
        const addressParts = [
          loc.address_line1,
          loc.address_line2,
          loc.city,
          loc.state,
          loc.postal_code
        ].filter(Boolean)

        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

        venue = {
          name: loc.name || null,
          address: fullAddress,
          googleMapsUrl: fullAddress
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
            : null
        }

        // Capture venue contact info from location record
        venueContactName = loc.contact_name || null
        venueContactPhone = loc.contact_phone || null
        venueContactEmail = loc.contact_email || null
      }

      return {
        id: ed.id,
        date: ed.event_date,
        setup_time: ed.setup_time,
        start_time: ed.start_time,
        end_time: ed.end_time,
        notes: ed.notes
      }
    })

    // If no venue from event_dates, try event's location
    if (!venue && event.location_id) {
      const { data: loc } = await supabase
        .from('locations')
        .select('name, address_line1, address_line2, city, state, postal_code')
        .eq('id', event.location_id)
        .single()

      if (loc) {
        const addressParts = [
          loc.address_line1,
          loc.address_line2,
          loc.city,
          loc.state,
          loc.postal_code
        ].filter(Boolean)

        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

        venue = {
          name: loc.name || null,
          address: fullAddress,
          googleMapsUrl: fullAddress
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
            : null
        }
      }
    }

    // Fallback to text location field
    if (!venue && event.location) {
      venue = {
        name: event.location,
        address: null,
        googleMapsUrl: null
      }
    }

    // Fetch staff assignments with phone numbers
    const { data: staffAssignments } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        arrival_time,
        start_time,
        end_time,
        users!event_staff_assignments_user_id_fkey (
          first_name,
          last_name,
          phone
        ),
        staff_roles!event_staff_assignments_staff_role_id_fkey (
          name,
          type
        )
      `)
      .eq('event_id', event.id)
      .order('created_at', { ascending: true })

    // Process staff - filter out Graphic Designers, deduplicate, and categorize
    const staffSet = new Set<string>()
    const eventStaff: Array<{
      name: string
      role: string | null
      phone: string | null
      isManager: boolean
    }> = []

    staffAssignments?.forEach((sa: any) => {
      const usersData = sa.users as unknown
      const user = Array.isArray(usersData) ? usersData[0] : usersData as UserData | null

      const rolesData = sa.staff_roles as unknown
      const staffRole = Array.isArray(rolesData) ? rolesData[0] : rolesData as RoleData | null

      // Skip Graphic Designers - they don't need event brief
      const roleName = staffRole?.name?.toLowerCase() || ''
      if (roleName.includes('graphic') || roleName.includes('designer')) {
        return
      }

      const name = user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown'
      const uniqueKey = `${name}-${staffRole?.name || ''}`

      // Deduplicate by name + role
      if (!staffSet.has(uniqueKey)) {
        staffSet.add(uniqueKey)

        const isManager = staffRole?.type === 'operations' || roleName.includes('manager')

        eventStaff.push({
          name,
          role: staffRole?.name || null,
          phone: user?.phone || null,
          isManager
        })
      }
    })

    // Sort: managers first, then alphabetically by name
    eventStaff.sort((a, b) => {
      if (a.isManager && !b.isManager) return -1
      if (!a.isManager && b.isManager) return 1
      return a.name.localeCompare(b.name)
    })

    // Fetch packages and add-ons from invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('event_id', event.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: true })

    let packageInfo: { name: string; description: string | null } | null = null
    const addOns: Array<{ name: string }> = []

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((inv: { id: string }) => inv.id)

      const { data: lineItems } = await supabase
        .from('invoice_line_items')
        .select('id, name, description, item_type')
        .in('invoice_id', invoiceIds)
        .neq('item_type', 'discount')
        .order('sort_order', { ascending: true })

      if (lineItems) {
        // Get first package
        const packages = (lineItems as LineItem[]).filter(
          (item: LineItem) => item.item_type === 'package'
        )
        if (packages.length > 0) {
          packageInfo = {
            name: packages[0].name,
            description: packages[0].description
          }
        }

        // Get all add-ons
        ;(lineItems as LineItem[])
          .filter((item: LineItem) => item.item_type === 'add_on' || item.item_type === 'custom')
          .forEach((item: LineItem) => {
            addOns.push({ name: item.name })
          })
      }
    }

    // Get account info
    const accountData = event.account as unknown
    const account = Array.isArray(accountData) ? accountData[0] : accountData as {
      id: string
      name: string
      phone: string | null
      email: string | null
    } | null

    // Build response optimized for staff brief
    const response = {
      event: {
        id: event.id,
        title: event.title,
        event_type: event.event_type,
        status: event.status
      },
      // Customer info
      customer: {
        name: account?.name || primaryContact?.name || null,
        companyName: account?.name || null,
        contactName: primaryContact?.name || null
      },
      // Schedule
      dates: formattedDates,
      // Location
      venue,
      // Contact Types:
      // 1. Venue Contact - employee of the venue (from location record)
      venueContact: {
        name: venueContactName,
        phone: venueContactPhone,
        email: venueContactEmail
      },
      // 2. Onsite Contact - client's designated person at the event (from event record)
      onsiteContact: {
        name: event.onsite_contact_name || null,
        phone: event.onsite_contact_phone || null,
        email: event.onsite_contact_email || null
      },
      // 3. Event Planner - professional third-party planner (from linked contact or fallback text fields)
      eventPlanner: eventPlannerContact || (event.event_planner_name ? {
        name: event.event_planner_name,
        phone: event.event_planner_phone || null,
        email: event.event_planner_email || null,
        company: null
      } : null),
      // Logistics
      arrivalInstructions: event.load_in_notes || null,
      dressCode: event.dress_code || null,
      // Package details
      package: packageInfo,
      addOns,
      eventNotes: event.description || null,
      // Staff
      staff: eventStaff,
      // Branding
      tenant: {
        id: event.tenant_id,
        logoUrl
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error({ error }, 'Error fetching staff brief')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
