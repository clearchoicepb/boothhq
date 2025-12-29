import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:events')

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

interface EventDateData {
  id: string
  event_date: string
  setup_time: string | null
  start_time: string | null
  end_time: string | null
  location_id: string | null
  location: {
    id: string
    name: string
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    notes: string | null
  } | null
}

interface StaffAssignment {
  id: string
  users: {
    first_name: string
    last_name: string
  } | null
  staff_roles: {
    name: string
    type: string
  } | null
}

interface LineItem {
  id: string
  name: string
  description: string | null
  item_type: string
}

/**
 * GET /api/public/events/[token]
 * Get event data for public client page (no auth required)
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
      return NextResponse.json({ error: 'Invalid event token' }, { status: 400 })
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch event by public_token
    log.info({ token: token.substring(0, 8) + '...' }, 'Looking up event by token')

    // First, do a simple query to check if the token exists
    const { data: simpleCheck, error: simpleError } = await supabase
      .from('events')
      .select('id, title, public_page_enabled')
      .eq('public_token', token)
      .single()

    if (simpleError) {
      log.error({
        error: simpleError,
        code: simpleError.code,
        message: simpleError.message,
        hint: simpleError.hint,
        details: simpleError.details
      }, 'Simple query failed')
      return NextResponse.json({
        error: 'Event not found',
        debug: { code: simpleError.code, message: simpleError.message }
      }, { status: 404 })
    }

    log.info({ eventId: simpleCheck?.id, title: simpleCheck?.title }, 'Simple check passed')

    // Now fetch full event data
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
        public_page_enabled,
        account_id,
        contact_id,
        primary_contact_id,
        account:accounts (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('public_token', token)
      .single()

    if (eventError) {
      log.error({ error: eventError, code: eventError.code, message: eventError.message }, 'Full query failed')
      return NextResponse.json({ error: 'Event not found', details: eventError.message }, { status: 404 })
    }

    if (!event) {
      log.error({ token: token.substring(0, 8) + '...' }, 'No event found with this token')
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    log.info({ eventId: event.id }, 'Event found')

    // Check if public page is enabled
    if (!event.public_page_enabled) {
      return NextResponse.json({ error: 'Public access disabled for this event' }, { status: 403 })
    }

    // Fetch tenant branding (logo)
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', event.tenant_id)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    const logoUrl = logoSetting?.setting_value || null

    // Fetch primary contact or contact from account
    let clientContact: {
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
        clientContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          email: contact.email,
          phone: contact.phone
        }
      }
    }

    // If no primary contact, try contact_id
    if (!clientContact && event.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, phone')
        .eq('id', event.contact_id)
        .single()

      if (contact) {
        clientContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          email: contact.email,
          phone: contact.phone
        }
      }
    }

    // If still no contact, try to get first contact from account
    if (!clientContact && event.account_id) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, phone')
        .eq('account_id', event.account_id)
        .limit(1)

      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        clientContact = {
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          email: contact.email,
          phone: contact.phone
        }
      }
    }

    // Fetch event dates with location info
    const { data: eventDates } = await supabase
      .from('event_dates')
      .select(`
        id,
        event_date,
        setup_time,
        start_time,
        end_time,
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
          notes
        )
      `)
      .eq('event_id', event.id)
      .order('event_date', { ascending: true })

    // Process event dates and get venue info
    let venue: {
      name: string | null
      address: string | null
    } | null = null

    const formattedDates = (eventDates || []).map((ed: EventDateData) => {
      const locationData = ed.location as unknown
      const loc = Array.isArray(locationData) ? locationData[0] : locationData

      // Get venue from first event date with location
      if (!venue && loc) {
        const addressParts = [
          loc.address_line1,
          loc.address_line2,
          loc.city,
          loc.state,
          loc.postal_code
        ].filter(Boolean)

        venue = {
          name: loc.name || null,
          address: addressParts.length > 0 ? addressParts.join(', ') : null
        }
      }

      return {
        id: ed.id,
        date: ed.event_date,
        setup_time: ed.setup_time,
        start_time: ed.start_time,
        end_time: ed.end_time
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

        venue = {
          name: loc.name || null,
          address: addressParts.length > 0 ? addressParts.join(', ') : null
        }
      }
    }

    // Fallback to text location field
    if (!venue && event.location) {
      venue = {
        name: event.location,
        address: null
      }
    }

    // Fetch staff assignments
    const { data: staffAssignments } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        users!event_staff_assignments_user_id_fkey (
          first_name,
          last_name
        ),
        staff_roles!event_staff_assignments_staff_role_id_fkey (
          name,
          type
        )
      `)
      .eq('event_id', event.id)
      .order('created_at', { ascending: true })

    // Filter out designers and deduplicate staff by name
    const staffSet = new Set<string>()
    const staff: { name: string; role: string | null }[] = []

    staffAssignments?.forEach((sa: StaffAssignment) => {
      const usersData = sa.users as unknown
      const user = Array.isArray(usersData) ? usersData[0] : usersData as {
        first_name: string
        last_name: string
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

      const name = user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown'

      // Deduplicate by name
      if (!staffSet.has(name)) {
        staffSet.add(name)
        staff.push({
          name,
          role: staffRole?.name || null
        })
      }
    })

    // Fetch packages and add-ons from invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, public_token, status, total_amount, paid_amount, balance_amount')
      .eq('event_id', event.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: true })

    let packages: { name: string; description: string | null }[] = []
    let addOns: { name: string }[] = []

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((inv: { id: string }) => inv.id)

      const { data: lineItems } = await supabase
        .from('invoice_line_items')
        .select('id, name, description, item_type')
        .in('invoice_id', invoiceIds)
        .neq('item_type', 'discount')
        .order('sort_order', { ascending: true })

      if (lineItems) {
        // Separate packages from add-ons (NO pricing)
        packages = (lineItems as LineItem[])
          .filter((item: LineItem) => item.item_type === 'package')
          .map((item: LineItem) => ({
            name: item.name,
            description: item.description
          }))

        addOns = (lineItems as LineItem[])
          .filter((item: LineItem) => item.item_type === 'add_on' || item.item_type === 'custom')
          .map((item: LineItem) => ({
            name: item.name
          }))
      }
    }

    // Get invoice info for to-do section (first non-draft invoice)
    const primaryInvoice = invoices && invoices.length > 0 ? invoices[0] : null
    const invoiceInfo = primaryInvoice ? {
      public_token: primaryInvoice.public_token,
      status: primaryInvoice.status,
      total_amount: primaryInvoice.total_amount,
      paid_amount: primaryInvoice.paid_amount || 0,
      balance_amount: primaryInvoice.balance_amount || primaryInvoice.total_amount,
      is_paid: primaryInvoice.status === 'paid' ||
               (primaryInvoice.balance_amount !== undefined && primaryInvoice.balance_amount <= 0)
    } : null

    // Fetch tenant subdomain from App DB for constructing URLs
    const appSupabase = await getAppSupabaseClient()
    const { data: tenantData } = await appSupabase
      .from('tenants')
      .select('subdomain')
      .eq('id', event.tenant_id)
      .single()

    const tenantSubdomain = tenantData?.subdomain || 'default'

    // Fetch ALL agreements/contracts (excluding drafts and deleted)
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, template_name, status, signed_at')
      .eq('event_id', event.id)
      .neq('status', 'draft')
      .is('deleted_at', null)  // Exclude soft-deleted contracts
      .order('created_at', { ascending: true })

    log.info({ eventId: event.id, contracts, contractsError: contractsError?.message }, 'Contracts query result')

    // Map all contracts to agreements array with correct URL pattern
    const agreements = (contracts || []).map((contract: {
      id: string
      template_name: string
      status: string
      signed_at: string | null
    }) => ({
      id: contract.id,
      title: contract.template_name,
      status: contract.status,
      is_signed: contract.status === 'signed',
      signed_at: contract.signed_at,
      // Use existing CRM URL pattern: /{tenant}/contracts/{id}/sign
      sign_url: `/${tenantSubdomain}/contracts/${contract.id}/sign`
    }))

    // Fetch event forms
    const { data: eventForms } = await supabase
      .from('event_forms')
      .select('id, name, public_id, status, completed_at')
      .eq('event_id', event.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: true })

    const forms = (eventForms || []).map((form: {
      id: string
      name: string
      public_id: string
      status: string
      completed_at: string | null
    }) => ({
      id: form.id,
      name: form.name,
      public_id: form.public_id,
      status: form.status,
      is_completed: form.status === 'completed',
      completed_at: form.completed_at
    }))

    // Fetch design proofs awaiting approval
    const { data: designProofs } = await supabase
      .from('design_proofs')
      .select('id, proof_name, file_name, public_token, status, uploaded_at, responded_at')
      .eq('event_id', event.id)
      .order('uploaded_at', { ascending: true })

    const proofs = (designProofs || []).map((proof: {
      id: string
      proof_name: string | null
      file_name: string
      public_token: string
      status: string
      uploaded_at: string
      responded_at: string | null
    }) => ({
      id: proof.id,
      name: proof.proof_name || proof.file_name,
      status: proof.status,
      is_approved: proof.status === 'approved',
      is_rejected: proof.status === 'rejected',
      uploaded_at: proof.uploaded_at,
      responded_at: proof.responded_at,
      proof_url: `/proof/${proof.public_token}`
    }))

    // Get account info
    const accountData = event.account as unknown
    const account = Array.isArray(accountData) ? accountData[0] : accountData as {
      id: string
      name: string
      email: string | null
      phone: string | null
    } | null

    // Build response
    const response = {
      event: {
        id: event.id,
        title: event.title,
        event_type: event.event_type,
        status: event.status
      },
      client: {
        name: account?.name || clientContact?.name || null,
        contact_name: clientContact?.name || null,
        email: clientContact?.email || account?.email || null,
        phone: clientContact?.phone || account?.phone || null
      },
      dates: formattedDates,
      venue,
      staff,
      package: packages.length > 0 ? packages[0] : null,
      add_ons: addOns,
      todo: {
        agreements,  // Array of all agreements
        invoice: invoiceInfo,
        forms,
        design_proofs: proofs  // Array of design proofs for approval
      },
      tenant: {
        id: event.tenant_id,
        logoUrl
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error({ error }, 'Error fetching public event')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
