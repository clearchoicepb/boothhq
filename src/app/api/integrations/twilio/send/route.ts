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
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('integrations')
      .eq('tenant_id', dataSourceTenantId)
      .single()

    console.log('🔍 Loading Twilio settings for tenant:', dataSourceTenantId)
    console.log('📋 Settings query result:', { settings, settingsError })

    let accountSid: string | undefined
    let authToken: string | undefined
    let fromNumber: string | undefined

    // Check if database settings exist and are enabled
    const twilioSettings = settings?.integrations?.thirdPartyIntegrations?.twilio
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

    // Add relationship IDs if provided
    if (opportunity_id) communicationData.opportunity_id = opportunity_id
    if (account_id) communicationData.account_id = account_id
    if (contact_id) communicationData.contact_id = contact_id
    if (lead_id) communicationData.lead_id = lead_id
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
