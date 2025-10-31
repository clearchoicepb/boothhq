import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { ROLES, isAdmin, canManageUsers, type UserRole } from '@/lib/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    // Query Tenant DB for user
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role or is editing themselves
    if (!canManageUsers(session.user.role as UserRole) && session.user.id !== id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    const {
      email,
      password_hash,
      first_name,
      last_name,
      role,
      phone,
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
      termination_date,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      permissions,
      avatar_url
    } = body

    // Query Tenant DB for user updates
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    // Prepare update data (only with fields that actually exist in the database)
    const updateData: any = {
      first_name,
      last_name,
      updated_at: new Date().toISOString()
    }

    // Add all staffing fields if provided
    if (phone !== undefined) updateData.phone = phone
    if (address_line_1 !== undefined) updateData.address_line_1 = address_line_1
    if (address_line_2 !== undefined) updateData.address_line_2 = address_line_2
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zip_code !== undefined) updateData.zip_code = zip_code
    if (job_title !== undefined) updateData.job_title = job_title
    if (department !== undefined) updateData.department = department
    if (employee_type !== undefined) updateData.employee_type = employee_type
    if (pay_rate !== undefined) updateData.pay_rate = pay_rate
    if (payroll_info !== undefined) updateData.payroll_info = payroll_info
    if (hire_date !== undefined) updateData.hire_date = hire_date
    if (termination_date !== undefined) updateData.termination_date = termination_date
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone
    if (emergency_contact_relationship !== undefined) updateData.emergency_contact_relationship = emergency_contact_relationship
    if (permissions !== undefined) updateData.permissions = permissions
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    // Add status if provided
    if (body.status) {
      updateData.status = body.status
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
        .eq('tenant_id', dataSourceTenantId)
        .neq('id', id)
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
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== DELETE USER API START ===')
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    console.log('[Delete User] Attempting to delete user:', id)
    
    if (!session?.user) {
      console.error('[Delete User] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      console.error('[Delete User] User is not admin:', session.user.role)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent users from deleting themselves
    if (session.user.id === id) {
      console.error('[Delete User] User attempting to delete themselves')
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Step 1: Delete from Tenant DB
    console.log('[Delete User] Deleting from Tenant DB...')
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const { error: tenantError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (tenantError) {
      console.error('[Delete User] Error deleting from Tenant DB:', tenantError)
      return NextResponse.json({ error: 'Failed to delete user from database' }, { status: 500 })
    }

    console.log('[Delete User] Deleted from Tenant DB successfully')

    // Step 2: Delete from Supabase Auth
    console.log('[Delete User] Deleting from Supabase Auth...')
    const appSupabase = createServerSupabaseClient()
    
    const { error: authError } = await appSupabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('[Delete User] Error deleting from Supabase Auth:', authError)
      // Log the error but don't fail the request since the user is already deleted from Tenant DB
      // This handles cases where the user might not exist in Auth
      console.warn('[Delete User] User may not exist in Supabase Auth, continuing...')
    } else {
      console.log('[Delete User] Deleted from Supabase Auth successfully')
    }

    console.log('[Delete User] User deleted successfully:', id)
    console.log('=== DELETE USER API END (SUCCESS) ===')
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('[Delete User] Caught exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
