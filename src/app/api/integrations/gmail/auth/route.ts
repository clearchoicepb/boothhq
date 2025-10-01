import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Gmail OAuth credentials from environment or settings
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`

    if (!clientId) {
      return NextResponse.json(
        { error: 'Gmail integration not configured. Please add GOOGLE_CLIENT_ID to environment variables.' },
        { status: 500 }
      )
    }

    // Define scopes for Gmail API
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ]

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent', // Force consent to get refresh token
      state: JSON.stringify({
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }),
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating OAuth URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
