import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { ROLES, isAdmin, canManageUsers, type UserRole } from '@/lib/roles'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:users')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id } = await params

    // Query Tenant DB for user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, 'Error fetching user')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove password from response
    const { password_hash: pwdHash, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/users/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
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
      country,
      home_latitude,
      home_longitude,
      job_title,
      department, // Legacy single department (deprecated)
      departments, // New multi-department support
      manager_of_departments, // Departments where user is a manager
      employee_type,
      pay_rate,
      payroll_info,
      hire_date,
      termination_date,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      permissions,
      avatar_url,
      // Payroll fields
      user_type,
      pay_type,
      default_flat_rate,
      mileage_enabled,
      mileage_rate
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
    if (country !== undefined) updateData.country = country
    if (home_latitude !== undefined) updateData.home_latitude = home_latitude
    if (home_longitude !== undefined) updateData.home_longitude = home_longitude
    if (job_title !== undefined) updateData.job_title = job_title

    // Handle departments: prefer new departments array, fall back to legacy department
    if (departments !== undefined && Array.isArray(departments)) {
      updateData.departments = departments
    } else if (department !== undefined) {
      // Legacy: if single department provided, convert to array
      updateData.departments = [department]
    }

    // Handle manager_of_departments array
    if (manager_of_departments !== undefined) {
      updateData.manager_of_departments = Array.isArray(manager_of_departments)
        ? manager_of_departments
        : []
    }

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

    // Payroll fields
    if (user_type !== undefined) updateData.user_type = user_type
    if (pay_type !== undefined) updateData.pay_type = pay_type
    if (default_flat_rate !== undefined) updateData.default_flat_rate = default_flat_rate
    if (mileage_enabled !== undefined) updateData.mileage_enabled = mileage_enabled
    if (mileage_rate !== undefined) updateData.mileage_rate = mileage_rate

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
      log.error({ error }, 'Error updating user')
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Remove password from response
    const { password_hash: pwdHash, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    log.error({ error }, 'Error in PUT /api/users/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    log.debug({}, '=== DELETE USER API START ===')
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    
    log.debug({ id }, 'Attempting to delete user')
    
    if (!session?.user) {
      log.error('[Delete User] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      log.error({ role: session.user.role }, 'User is not admin')
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent users from deleting themselves
    if (session.user.id === id) {
      log.error('[Delete User] User attempting to delete themselves')
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Step 1: Delete from Tenant DB
    log.debug({}, 'Deleting from Tenant DB...')
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const { error: tenantError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (tenantError) {
      log.error({ tenantError }, '[Delete User] Error deleting from Tenant DB')
      return NextResponse.json({ error: 'Failed to delete user from database' }, { status: 500 })
    }

    log.debug({}, 'Deleted from Tenant DB successfully')

    // Step 2: Delete from Supabase Auth
    log.debug({}, 'Deleting from Supabase Auth...')
    const appSupabase = createServerSupabaseClient()
    
    const { error: authError } = await appSupabase.auth.admin.deleteUser(id)

    if (authError) {
      log.error({ authError }, '[Delete User] Error deleting from Supabase Auth')
      // Log the error but don't fail the request since the user is already deleted from Tenant DB
      // This handles cases where the user might not exist in Auth
      log.warn('[Delete User] User may not exist in Supabase Auth, continuing...')
    } else {
      log.debug({}, 'Deleted from Supabase Auth successfully')
    }

    log.debug({ id }, 'User deleted successfully')
    log.debug({}, '=== DELETE USER API END (SUCCESS) ===')
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    log.error({ error }, '[Delete User] Caught exception')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
