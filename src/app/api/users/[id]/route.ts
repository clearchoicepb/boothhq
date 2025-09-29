import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { ROLES, isAdmin, canManageUsers, type UserRole } from '@/lib/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove password from response
    const { password_hash: pwdHash, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('PUT /api/users/[id] - Full session:', JSON.stringify(session, null, 2))
    console.log('PUT /api/users/[id] - Session user role:', session.user.role)
    console.log('PUT /api/users/[id] - Session user role type:', typeof session.user.role)
    console.log('PUT /api/users/[id] - User ID being edited:', params.id)
    console.log('PUT /api/users/[id] - Session user ID:', session.user.id)

    // Check if user has admin role or is editing themselves
    console.log('PUT /api/users/[id] - Testing canManageUsers with role:', session.user.role)
    console.log('PUT /api/users/[id] - canManageUsers result:', canManageUsers(session.user.role as UserRole))
    console.log('PUT /api/users/[id] - isAdmin result:', isAdmin(session.user.role as UserRole))
    
    if (!canManageUsers(session.user.role as UserRole) && session.user.id !== params.id) {
      console.log('PUT /api/users/[id] - Permission denied - not admin and not self')
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    console.log('PUT /api/users/[id] - Request body:', JSON.stringify(body, null, 2))
    
    const {
      email,
      password_hash,
      first_name,
      last_name,
      role,
      phone,
      is_active,
      address_line_1,
      address_line_2,
      city,
      state,
      zip_code,
      job_title,
      department,
      employee_type,
      pay_rate,
      payroll_info,
      hire_date,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship
    } = body

    const supabase = createServerSupabaseClient()

    // Prepare update data (only with fields that actually exist in the database)
    const updateData: any = {
      first_name,
      last_name,
      updated_at: new Date().toISOString()
    }

    // Only admins can change role
    if (isAdmin(session.user.role as UserRole)) {
      updateData.role = role
    }

    // Only update email if it's not already taken
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', session.user.tenantId)
        .neq('id', params.id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
      }
      updateData.email = email
    }

    // Note: Password field doesn't exist in current schema
    // TODO: Add password field when migrations are applied

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Remove password from response
    const { password_hash: pwdHash, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error in PUT /api/users/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent users from deleting themselves
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
