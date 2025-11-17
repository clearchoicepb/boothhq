import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// Create Supabase client for webhook (no auth required)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Twilio Inbound SMS Webhook Handler
 * Receives incoming SMS messages and logs them as communications
 *
 * Twilio sends POST requests with the following key parameters:
 * - MessageSid: Unique identifier for the message
 * - From: Sender's phone number
 * - To: Your Twilio number
 * - Body: Message content
 * - NumMedia: Number of media items (0 for text-only)
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Parse the incoming form data from Twilio
    const formData = await request.formData()

    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    console.log('📨 Incoming SMS:', { messageSid, from, to, body })

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
        console.error('❌ Invalid Twilio signature')
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // Normalize phone number for matching (remove +1, spaces, dashes, etc.)
    const normalizePhone = (phone: string) => {
      return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10) // Last 10 digits
    }

    const normalizedFrom = normalizePhone(from)

    // Try to match the phone number to a contact, account, or lead
    let contactId: string | null = null
    let accountId: string | null = null
    let leadId: string | null = null
    let opportunityId: string | null = null
    let tenantId: string | null = null

    // Search contacts by phone number - try multiple formats
    const { data: contactsArray } = await supabase
      .from('contacts')
      .select('id, tenant_id, account_id, phone')

    // Filter in JavaScript to match normalized phone numbers
    const contacts = contactsArray?.find(c => {
      if (!c.phone) return false
      const normalizedDbPhone = c.phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
      return normalizedDbPhone === normalizedFrom
    })

    if (contacts) {
      contactId = contacts.id
      accountId = contacts.account_id
      tenantId = contacts.tenant_id

      // Try to find the most recent opportunity for this contact
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('id')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (opportunity) {
        opportunityId = opportunity.id
      }
    }

    // If no contact found, try leads
    if (!contactId) {
      const { data: leadsArray } = await supabase
        .from('leads')
        .select('id, tenant_id, phone')

      // Filter in JavaScript to match normalized phone numbers
      const lead = leadsArray?.find(l => {
        if (!l.phone) return false
        const normalizedDbPhone = l.phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
        return normalizedDbPhone === normalizedFrom
      })

      if (lead) {
        leadId = lead.id
        tenantId = lead.tenant_id

        // Try to find the most recent opportunity for this lead
        const { data: opportunity } = await supabase
          .from('opportunities')
          .select('id')
          .eq('lead_id', leadId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (opportunity) {
          opportunityId = opportunity.id
        }
      }
    }

    // If no contact or lead found, try accounts
    if (!contactId && !leadId) {
      const { data: accountsArray } = await supabase
        .from('accounts')
        .select('id, tenant_id, phone')

      // Filter in JavaScript to match normalized phone numbers
      const account = accountsArray?.find(a => {
        if (!a.phone) return false
        const normalizedDbPhone = a.phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
        return normalizedDbPhone === normalizedFrom
      })

      if (account) {
        accountId = account.id
        tenantId = account.tenant_id

        // Try to find the most recent opportunity for this account
        const { data: opportunity } = await supabase
          .from('opportunities')
          .select('id')
          .eq('account_id', accountId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (opportunity) {
          opportunityId = opportunity.id
        }
      }
    }

    // Log matching results
    console.log('🔍 Matching results:', {
      normalizedFrom,
      tenantId,
      contactId,
      leadId,
      accountId,
      opportunityId
    })

    // If we didn't find a tenant via contact matching, try to find by receiving phone number
    if (!tenantId) {
      console.log('🔍 No tenant found via contact, trying to match by receiving phone number:', to)
      
      // Query tenant_settings to find which tenant has this Twilio number configured
      const { data: settingsRows } = await supabase
        .from('tenant_settings')
        .select('tenant_id, setting_value')
        .eq('setting_key', 'integrations.thirdPartyIntegrations.twilio.phoneNumber')
      
      // Find tenant with matching phone number
      const matchingTenant = settingsRows?.find(row => {
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
        console.log('✅ Found tenant by phone number:', tenantId)
      }
    }

    // Log the communication (with or without contact associations)
    if (tenantId) {
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

      const { data: communication, error: commError } = await supabase
        .from('communications')
        .insert(communicationData)
        .select()
        .single()

      if (commError) {
        console.error('❌ Error logging inbound SMS:', commError)
      } else {
        console.log('✅ Inbound SMS logged:', communication.id, contactId ? 'with contact' : 'without contact match')
      }
    } else {
      // Still couldn't find tenant - log warning but don't fail
      console.warn('⚠️ Could not determine tenant for incoming SMS from:', from, 'to:', to)
      console.warn('⚠️ Message will not be logged. Consider adding this as a lead or contact.')
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
    console.error('Error processing inbound SMS:', error)

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
