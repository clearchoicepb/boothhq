import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { ROLES, isAdmin, type UserRole } from '@/lib/roles'
import bcrypt from 'bcryptjs'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:users')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const active = searchParams.get('active')
    const includeArchived = searchParams.get('include_archived') === 'true'

    // Query Tenant DB for users (users table is now in Tenant DB)
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')

    // Build query for users
    let query = supabase
      .from('users')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('first_name', { ascending: true })

    // Filter by status if active=true
    if (active === 'true') {
      query = query.eq('status', 'active')
    }

    // Filter out archived users by default (unless include_archived=true)
    if (!includeArchived) {
      query = query.is('archived_at', null)
    }

    const { data: users, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching users')
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Filter by department if specified (post-query since departments is an array)
    let filteredUsers = users || []
    if (department) {
      filteredUsers = filteredUsers.filter(user => {
        const userDepts: string[] = user.departments || []
        return userDepts.includes(department)
      })
    }

    return NextResponse.json(filteredUsers)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/users')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    log.debug({}, '=== CREATE USER API START ===')
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      log.error('[Create User] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      log.error({ role: session.user.role }, 'User is not admin')
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    log.debug({
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      tenant_id: body.tenant_id,
      has_password: !!body.password
    }, 'Request body')

    const {
      email,
      password,
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
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      tenant_id,
      // Payroll fields
      user_type,
      pay_type,
      default_flat_rate,
      mileage_enabled,
      mileage_rate
    } = body

    // Validate required fields
    if (!email || !first_name || !last_name || !tenant_id) {
      const missing = []
      if (!email) missing.push('email')
      if (!first_name) missing.push('first_name')
      if (!last_name) missing.push('last_name')
      if (!tenant_id) missing.push('tenant_id')
      
      log.error({ missing }, '[Create User] Missing required fields')
      return NextResponse.json({
        error: `Missing required fields: ${missing.join(', ')}`
      }, { status: 400 })
    }

    // Validate password for new users
    if (!password) {
      log.error('[Create User] Password is required')
      return NextResponse.json({
        error: 'Password is required for new users'
      }, { status: 400 })
    }

    // Use App DB for auth operations
    const appSupabase = createServerSupabaseClient()

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase()
    log.debug({ normalizedEmail }, 'Normalized email')

    // Check if user already exists in Tenant DB users table
    log.debug({}, 'Checking if user exists in Tenant DB...')
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const tenantSupabase = await getTenantDatabaseClient(tenant_id)
    
    const { data: existingUser } = await tenantSupabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .eq('tenant_id', tenant_id)
      .single()

    if (existingUser) {
      log.error({ normalizedEmail }, '[Create User] User already exists in users table')
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Check if user already exists in Supabase Auth
    log.debug({}, 'Checking if user exists in Supabase Auth...')
    const { data: existingAuthUsers } = await appSupabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let authUserId: string

    if (existingAuthUser) {
      log.debug({ normalizedEmail }, 'User exists in Supabase Auth but not in Tenant DB - reusing auth user')
      // User was previously deleted from Tenant DB but still exists in Auth
      // Update their password and reuse the account
      const { error: updateError } = await appSupabase.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password,
          email: normalizedEmail, // Ensure email is normalized
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            tenant_id
          }
        }
      )

      if (updateError) {
        log.error({ updateError }, '[Create User] Error updating existing auth user')
        return NextResponse.json({ error: `Failed to update auth user: ${updateError.message}` }, { status: 500 })
      }

      authUserId = existingAuthUser.id
      log.debug({ authUserId }, 'Reusing existing auth user')
    } else {
      // Step 1: Create new auth user in Supabase Auth
      log.debug({}, 'Creating new user in Supabase Auth...')
      const { data: authData, error: authError } = await appSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name,
          last_name,
          tenant_id
        }
      })

      if (authError) {
        log.error({ authError }, '[Create User] Supabase Auth error')
        return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 })
      }

      if (!authData.user) {
        log.error('[Create User] No user returned from Supabase Auth')
        return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
      }

      authUserId = authData.user.id
      log.debug({ authUserId }, 'User created in Supabase Auth')
    }

    // Step 2: Hash the password for Tenant DB
    log.debug({}, 'Hashing password for Tenant DB...')
    const password_hash = await bcrypt.hash(password, 10)

    // Step 3: Create user record in Tenant DB users table with the auth user's ID
    log.debug({ authUserId }, 'Creating user record in Tenant DB with ID')

    // Prepare insert data
    const insertData: any = {
      id: authUserId, // Use the auth user's ID
      email: normalizedEmail,
      password_hash,
      first_name,
      last_name,
      role: role || 'user',
      tenant_id,
      status: 'active',
      phone,
      address_line_1,
      address_line_2,
      city,
      state,
      zip_code,
      country: country || 'US',
      home_latitude,
      home_longitude,
      job_title,
      employee_type,
      pay_rate,
      payroll_info,
      hire_date,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      // Payroll fields
      user_type: user_type || 'staff',
      pay_type: pay_type || 'hourly',
      default_flat_rate,
      mileage_enabled: mileage_enabled ?? false,
      mileage_rate: mileage_rate ?? 0.50
    }

    // Handle departments: prefer new departments array, fall back to legacy department
    if (departments && Array.isArray(departments)) {
      insertData.departments = departments
    } else if (department) {
      // Legacy: if single department provided, convert to array
      insertData.departments = [department]
    }

    // Handle manager_of_departments array
    if (manager_of_departments && Array.isArray(manager_of_departments)) {
      insertData.manager_of_departments = manager_of_departments
    }

    const { data: user, error: userError } = await tenantSupabase
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (userError) {
      log.error({ userError }, '[Create User] Error creating user in Tenant DB')
      // Rollback: delete the auth user if we can't create the user record (only if it was newly created)
      if (!existingAuthUser) {
        log.debug({}, 'Rolling back newly created Supabase Auth user...')
        await appSupabase.auth.admin.deleteUser(authUserId)
      }
      return NextResponse.json({ error: `Failed to create user record: ${userError.message}` }, { status: 500 })
    }

    log.debug({ userId: user.id }, 'User created successfully')
    log.debug({}, '=== CREATE USER API END (SUCCESS) ===')
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    log.error({ error }, '[Create User] Caught exception')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}