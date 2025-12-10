import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { getTenantClient } from '@/lib/data-sources'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:integrations')

/**
 * Twilio Inbound SMS Webhook Handler
 * Receives incoming SMS messages and logs them as communications
 *
 * IMPORTANT: This webhook writes to the TENANT DATABASE, not the Application DB!
 * The communications table lives in the tenant-specific data database.
 *
 * Twilio sends POST requests with the following key parameters:
 * - MessageSid: Unique identifier for the message
 * - From: Sender's phone number
 * - To: Your Twilio number
 * - Body: Message content
 * - NumMedia: Number of media items (0 for text-only)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the incoming form data from Twilio
    const formData = await request.formData()

    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    // NOTE: Never log SMS body or phone numbers - contains PII
    log.info({ messageSid }, 'Incoming SMS received')

    // Validate Twilio signature for security
    const twilioSignature = request.headers.get('X-Twilio-Signature') || ''
    const authToken = process.env.TWILIO_AUTH_TOKEN || ''

    if (authToken) {
      const url = request.url
      const params: Record<string, string> = {}
      formData.forEach((value, key) => {
        params[key] = value as string
      })

      const isValid = twilio.validateRequest(authToken, twilioSignature, url, params)

      if (!isValid) {
        log.error('Invalid Twilio signature')
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // Normalize phone number for matching (remove +1, spaces, dashes, etc.)
    const normalizePhone = (phone: string) => {
      return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10) // Last 10 digits
    }

    const normalizedFrom = normalizePhone(from)

    // STEP 1: Find which tenant owns the receiving phone number
    log.debug('Finding tenant for receiving phone number')

    const appSupabase = createServerSupabaseClient()
    const { data: settingsRows, error: settingsError } = await appSupabase
      .from('tenant_settings')
      .select('tenant_id, setting_key, setting_value')
      .like('setting_key', 'integrations.thirdPartyIntegrations.twilio%')

    log.debug({ settingsCount: settingsRows?.length || 0 }, 'Twilio settings found')
    if (settingsError) {
      log.error({ settingsError }, 'Error fetching settings')
    }
    
    let tenantId: string | null = null
    const phoneNumberRows = settingsRows?.filter(row =>
      row.setting_key === 'integrations.thirdPartyIntegrations.twilio.phoneNumber'
    )

    const matchingTenant = phoneNumberRows?.find(row => {
      const configuredNumber = row.setting_value
      if (typeof configuredNumber === 'string') {
        const normalizedConfigured = normalizePhone(configuredNumber)
        const normalizedTo = normalizePhone(to)
        return normalizedConfigured === normalizedTo
      }
      return false
    })

    if (matchingTenant) {
      tenantId = matchingTenant.tenant_id
      log.debug({ tenantFound: true }, 'Tenant matched to receiving phone number')
    } else {
      log.warn('Could not determine tenant for incoming SMS')
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // STEP 2: Get Tenant Database client
    log.debug('Connecting to tenant database')
    // tenantId is guaranteed to be non-null here (we return early if not matched)
    const tenantSupabase = await getTenantClient(tenantId!)

    // STEP 3: Try to find matching contact, lead, or account in TENANT DB
    log.debug('Looking for contact/lead/account by phone number')
    
    let contactId: string | null = null
    let accountId: string | null = null
    let leadId: string | null = null
    let opportunityId: string | null = null

    // Search contacts by phone number
    const { data: contactsArray } = await tenantSupabase
      .from('contacts')
      .select('id, account_id, phone')
      .eq('tenant_id', tenantId)

    // Filter in JavaScript to match normalized phone numbers
    const contact = contactsArray?.find(c => {
      if (!c.phone) return false
      const normalizedDbPhone = normalizePhone(c.phone)
      return normalizedDbPhone === normalizedFrom
    })

    if (contact) {
      contactId = contact.id
      accountId = contact.account_id

      // Try to find the most recent opportunity for this contact
      const { data: opportunity } = await tenantSupabase
        .from('opportunities')
        .select('id')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (opportunity) {
        opportunityId = opportunity.id
      }
    }

    // If no contact found, try leads
    if (!contactId) {
      const { data: leadsArray } = await tenantSupabase
        .from('leads')
        .select('id, phone')
        .eq('tenant_id', tenantId)

      // Filter in JavaScript to match normalized phone numbers
      const lead = leadsArray?.find(l => {
        if (!l.phone) return false
        const normalizedDbPhone = normalizePhone(l.phone)
        return normalizedDbPhone === normalizedFrom
      })

      if (lead) {
        leadId = lead.id

        // Try to find the most recent opportunity for this lead
        const { data: opportunity } = await tenantSupabase
          .from('opportunities')
          .select('id')
          .eq('lead_id', leadId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (opportunity) {
          opportunityId = opportunity.id
        }
      }
    }

    // If no contact or lead found, try accounts
    if (!contactId && !leadId) {
      const { data: accountsArray } = await tenantSupabase
        .from('accounts')
        .select('id, phone')
        .eq('tenant_id', tenantId)

      // Filter in JavaScript to match normalized phone numbers
      const account = accountsArray?.find(a => {
        if (!a.phone) return false
        const normalizedDbPhone = normalizePhone(a.phone)
        return normalizedDbPhone === normalizedFrom
      })

      if (account) {
        accountId = account.id

        // Try to find the most recent opportunity for this account
        const { data: opportunity } = await tenantSupabase
          .from('opportunities')
          .select('id')
          .eq('account_id', accountId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (opportunity) {
          opportunityId = opportunity.id
        }
      }
    }

    // Log matching results (without exposing IDs)
    log.debug({
      hasContact: !!contactId,
      hasLead: !!leadId,
      hasAccount: !!accountId,
      hasOpportunity: !!opportunityId
    }, 'Phone number matching completed')

    // STEP 4: Log the communication to TENANT DATABASE
    log.debug('Logging communication to tenant database')
    
    const communicationData = {
      tenant_id: tenantId,
      communication_type: 'sms',
      direction: 'inbound',
      subject: 'Incoming SMS',
      notes: body,
      status: 'received',
      communication_date: new Date().toISOString(),
      contact_id: contactId,
      account_id: accountId,
      opportunity_id: opportunityId,
      lead_id: leadId,
      metadata: {
        twilio_sid: messageSid,
        from_number: from,
        to_number: to,
        num_media: numMedia,
      }
    }

    const { data: communication, error: commError } = await tenantSupabase
      .from('communications')
      .insert(communicationData)
      .select()
      .single()

    if (commError) {
      log.error({ commError }, 'Error logging inbound SMS to tenant database')
    } else {
      log.info({ hasContactMatch: !!contactId }, 'Inbound SMS logged to tenant database')
    }

    // Return TwiML response (empty response = no auto-reply)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })

  } catch (error: any) {
    log.error({ error }, '❌ Error processing inbound SMS')

    // Still return 200 to Twilio to avoid retries
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    )
  }
}
