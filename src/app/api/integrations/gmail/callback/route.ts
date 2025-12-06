import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:integrations')
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/default/settings/email?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/default/settings/email?error=missing_params', request.url)
      )
    }

    // Parse state to get user info
    const { userId, tenantId } = JSON.parse(state)

    // Get tenant subdomain for redirect
    const { data: tenant } = await supabase
      .from('tenants')
      .select('subdomain')
      .eq('id', tenantId)
      .single()

    const tenantSubdomain = tenant?.subdomain || 'default'

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL(`/${tenantSubdomain}/settings/email?error=missing_config`, request.url)
      )
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      // SECURITY: Never log OAuth response bodies - they may contain tokens or sensitive error details
      log.error({ status: tokenResponse.status }, 'Gmail OAuth token exchange failed')
      return NextResponse.redirect(
        new URL(`/${tenantSubdomain}/settings/email?error=token_exchange_failed`, request.url)
      )
    }

    const tokens = await tokenResponse.json()

    // Get user's email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userInfoResponse.json()

    // Store tokens in database (supabase already created above)
    const expiryDate = new Date()
    expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in)

    const { error: dbError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        integration_type: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryDate.toISOString(),
        is_connected: true,
        settings: {
          email: userInfo.email,
          from_email: userInfo.email,
        },
        updated_at: new Date().toISOString(),
      })

    if (dbError) {
      log.error({ dbError }, 'Database error')
      return NextResponse.redirect(
        new URL(`/${tenantSubdomain}/settings/email?error=database_error`, request.url)
      )
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL(`/${tenantSubdomain}/settings/email?success=gmail_connected`, request.url)
    )
  } catch (error) {
    log.error({ error }, 'OAuth callback error')
    return NextResponse.redirect(
      new URL('/default/settings/email?error=unexpected_error', request.url)
    )
  }
}
