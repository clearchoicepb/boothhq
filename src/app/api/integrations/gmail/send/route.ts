import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

// Helper to refresh access token if expired
async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }

  return await response.json()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, body: emailBody, opportunity_id, account_id, contact_id, lead_id, event_id } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    // Get user's Gmail integration
    const supabase = createServerSupabaseClient()

    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('integration_type', 'gmail')
      .eq('is_connected', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account in settings.' },
        { status: 400 }
      )
    }

    let accessToken = integration.access_token

    // Check if token is expired and refresh if needed
    const tokenExpiry = new Date(integration.token_expiry)
    if (tokenExpiry <= new Date()) {
      const tokens = await refreshAccessToken(integration.refresh_token)
      accessToken = tokens.access_token

      // Update tokens in database
      const newExpiry = new Date()
      newExpiry.setSeconds(newExpiry.getSeconds() + tokens.expires_in)

      await supabase
        .from('user_integrations')
        .update({
          access_token: tokens.access_token,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
    }

    // Construct email in RFC 2822 format
    const fromEmail = integration.settings.email || session.user.email
    const emailContent = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      emailBody,
    ].join('\r\n')

    // Encode email in base64url format
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send email via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('Gmail API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send email via Gmail API' },
        { status: 500 }
      )
    }

    const sendResult = await sendResponse.json()

    // Log to communications table
    const { data: communication, error: commError } = await supabase
      .from('communications')
      .insert({
        tenant_id: session.user.tenantId,
        opportunity_id: opportunity_id || null,
        account_id: account_id || null,
        contact_id: contact_id || null,
        lead_id: lead_id || null,
        event_id: event_id || null,
        communication_type: 'email',
        direction: 'outbound',
        subject,
        notes: emailBody,
        status: 'sent',
        metadata: {
          gmail_message_id: sendResult.id,
          to,
        },
        communication_date: new Date().toISOString(),
        created_by: session.user.id,
      })
      .select()
      .single()

    if (commError) {
      console.error('Error logging communication:', commError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: sendResult.id,
      communication,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
