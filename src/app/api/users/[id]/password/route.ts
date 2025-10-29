import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { isAdmin, type UserRole } from '@/lib/roles'
import bcrypt from 'bcryptjs'

/**
 * Change user password
 * Updates password in BOTH Supabase Auth and users table
 * 
 * POST /api/users/[id]/password
 * Body: { password: string, currentPassword?: string }
 * 
 * - Users can change their own password (requires currentPassword)
 * - Admins can reset any user's password (no currentPassword needed)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { password, currentPassword } = body

    if (!password || password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }

    const isChangingOwnPassword = session.user.id === id
    const isUserAdmin = isAdmin(session.user.role as UserRole)

    // If user is changing their own password, require current password
    if (isChangingOwnPassword && !isUserAdmin) {
      if (!currentPassword) {
        return NextResponse.json({ 
          error: 'Current password is required to change your own password' 
        }, { status: 400 })
      }

      // Verify current password by attempting to sign in
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword
      })

      if (signInError) {
        return NextResponse.json({ 
          error: 'Current password is incorrect' 
        }, { status: 401 })
      }
    } else if (!isUserAdmin) {
      // If not changing own password and not admin, deny
      return NextResponse.json({ 
        error: 'Insufficient permissions' 
      }, { status: 403 })
    }

    // Get user info from users table
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const tenantSupabase = await getTenantDatabaseClient(session.user.tenantId)
    
    const { data: user, error: userError } = await tenantSupabase
      .from('users')
      .select('email, tenant_id')
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Step 1: Update password in Supabase Auth
    const appSupabase = createServerSupabaseClient()
    const { error: authError } = await appSupabase.auth.admin.updateUserById(
      id,
      { password }
    )

    if (authError) {
      console.error('Error updating password in Supabase Auth:', authError)
      return NextResponse.json({ 
        error: `Failed to update password: ${authError.message}` 
      }, { status: 500 })
    }

    // Step 2: Update password_hash in users table (for consistency)
    const passwordHash = await bcrypt.hash(password, 10)
    const { error: updateError } = await tenantSupabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (updateError) {
      console.warn('Warning: Could not update password_hash in users table:', updateError)
      // Don't fail the request since Supabase Auth is the source of truth
    }

    console.log(`Password updated successfully for user ${id} (${user.email})`)

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully' 
    })
  } catch (error) {
    console.error('Error in POST /api/users/[id]/password:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

