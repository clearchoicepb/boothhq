import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()
    const { to, message, opportunity_id, account_id, contact_id, lead_id, event_id } = body

    // Validate input
    if (!to || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 })
    }

    // Get Twilio credentials from settings (fallback to environment variables)
    // Note: tenant_settings is a key-value store, so we use the settings API to reconstruct it
    const settingsResponse = await fetch(`${request.nextUrl.origin}/api/settings`, {
      headers: request.headers
    })
    
    let twilioSettings = null
    if (settingsResponse.ok) {
      const data = await settingsResponse.json()
      twilioSettings = data.settings?.integrations?.thirdPartyIntegrations?.twilio
      console.log('🔍 Loading Twilio settings for tenant:', dataSourceTenantId)
      console.log('📋 Settings loaded:', { 
        enabled: twilioSettings?.enabled, 
        hasAccountSid: !!twilioSettings?.accountSid,
        hasAuthToken: !!twilioSettings?.authToken,
        phoneNumber: twilioSettings?.phoneNumber 
      })
    } else {
      console.warn('⚠️ Failed to load settings from API, will use env vars')
    }

    let accountSid: string | undefined
    let authToken: string | undefined
    let fromNumber: string | undefined

    // Check if database settings exist and are enabled
    const isDatabaseConfigured = twilioSettings?.enabled && 
                                  twilioSettings?.accountSid && 
                                  twilioSettings?.authToken && 
                                  twilioSettings?.phoneNumber

    if (isDatabaseConfigured) {
      // Use database settings (PRIORITY)
      accountSid = twilioSettings.accountSid
      authToken = twilioSettings.authToken
      fromNumber = twilioSettings.phoneNumber
      console.log('✅ Using DATABASE Twilio settings:', { fromNumber, accountSid: accountSid?.substring(0, 10) + '...' })
    } else {
      // Fallback to environment variables
      accountSid = process.env.TWILIO_ACCOUNT_SID
      authToken = process.env.TWILIO_AUTH_TOKEN
      fromNumber = process.env.TWILIO_PHONE_NUMBER
      console.log('⚠️ Using ENVIRONMENT VARIABLE Twilio settings:', { fromNumber, accountSid: accountSid?.substring(0, 10) + '...' })
    }

    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Twilio credentials not configured')
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 })
    }

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('To', to)
    formData.append('From', fromNumber)
    formData.append('Body', message)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json()
      console.error('Twilio API error:', errorData)
      return NextResponse.json({
        error: errorData.message || 'Failed to send SMS'
      }, { status: twilioResponse.status })
    }

    const twilioData = await twilioResponse.json()

    // Normalize phone number for matching (remove +1, spaces, dashes, parentheses)
    const normalizePhone = (phone: string) => {
      return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
    }
    const normalizedTo = normalizePhone(to)

    // If no relationship IDs provided, try to find them by phone number
    let resolvedContactId = contact_id
    let resolvedAccountId = account_id
    let resolvedLeadId = lead_id
    let resolvedOpportunityId = opportunity_id

    if (!contact_id && !lead_id && !account_id) {
      console.log('🔍 No relationship IDs provided, looking up phone number:', to)

      // Search contacts by phone number
      const { data: contactsArray } = await supabase
        .from('contacts')
        .select('id, account_id, phone')
        .eq('tenant_id', dataSourceTenantId)

      const matchedContact = contactsArray?.find(c => {
        if (!c.phone) return false
        return normalizePhone(c.phone) === normalizedTo
      })

      if (matchedContact) {
        resolvedContactId = matchedContact.id
        resolvedAccountId = matchedContact.account_id
        console.log('✅ Found matching contact:', resolvedContactId)
      }

      // If no contact found, try leads
      if (!resolvedContactId) {
        const { data: leadsArray } = await supabase
          .from('leads')
          .select('id, phone')
          .eq('tenant_id', dataSourceTenantId)

        const matchedLead = leadsArray?.find(l => {
          if (!l.phone) return false
          return normalizePhone(l.phone) === normalizedTo
        })

        if (matchedLead) {
          resolvedLeadId = matchedLead.id
          console.log('✅ Found matching lead:', resolvedLeadId)
        }
      }

      // If no contact or lead found, try accounts
      if (!resolvedContactId && !resolvedLeadId) {
        const { data: accountsArray } = await supabase
          .from('accounts')
          .select('id, phone')
          .eq('tenant_id', dataSourceTenantId)

        const matchedAccount = accountsArray?.find(a => {
          if (!a.phone) return false
          return normalizePhone(a.phone) === normalizedTo
        })

        if (matchedAccount) {
          resolvedAccountId = matchedAccount.id
          console.log('✅ Found matching account:', resolvedAccountId)
        }
      }
    }

    // Log the communication in the database
    const communicationData: any = {
      tenant_id: dataSourceTenantId,
      created_by: session.user.id,
      communication_type: 'sms',
      direction: 'outbound',
      subject: 'SMS Message',
      notes: message,
      status: 'sent',
      communication_date: new Date().toISOString(),
      metadata: {
        twilio_sid: twilioData.sid,
        to_number: to,
        from_number: fromNumber,
      }
    }

    // Add relationship IDs (either provided or resolved by phone lookup)
    if (resolvedOpportunityId) communicationData.opportunity_id = resolvedOpportunityId
    if (resolvedAccountId) communicationData.account_id = resolvedAccountId
    if (resolvedContactId) communicationData.contact_id = resolvedContactId
    if (resolvedLeadId) communicationData.lead_id = resolvedLeadId
    if (event_id) communicationData.event_id = event_id

    const { data: communication, error: dbError } = await supabase
      .from('communications')
      .insert(communicationData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // SMS was sent but logging failed - still return success
      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully (logging failed)',
        twilio_sid: twilioData.sid
      })
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      communication,
      twilio_sid: twilioData.sid
    })
  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    }, { status: 500 })
  }
}
