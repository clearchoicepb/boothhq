import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:auth')

/**
 * Send password reset email
 * 
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * 
 * Uses Supabase Auth's built-in password reset functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    // Get the app URL for the reset redirect
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/auth/reset-password`

    // Use Supabase Auth to send password reset email
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl
    })

    if (error) {
      log.error({ error }, 'Error sending password reset email')
      
      // Don't reveal if email exists or not (security best practice)
      // Always return success to prevent user enumeration
      return NextResponse.json({ 
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link shortly.' 
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with that email, you will receive a password reset link shortly.' 
    })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/auth/forgot-password')
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

