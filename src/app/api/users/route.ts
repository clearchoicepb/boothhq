import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { ROLES, isAdmin, type UserRole } from '@/lib/roles'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    // Query Tenant DB for users (users table is now in Tenant DB)
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    // Get all users for the current tenant
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE USER API START ===')
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      console.error('[Create User] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      console.error('[Create User] User is not admin:', session.user.role)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    console.log('[Create User] Request body:', {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      tenant_id: body.tenant_id,
      has_password: !!body.password
    })

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
      job_title,
      department,
      employee_type,
      pay_rate,
      payroll_info,
      hire_date,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      tenant_id
    } = body

    // Validate required fields
    if (!email || !first_name || !last_name || !tenant_id) {
      const missing = []
      if (!email) missing.push('email')
      if (!first_name) missing.push('first_name')
      if (!last_name) missing.push('last_name')
      if (!tenant_id) missing.push('tenant_id')
      
      console.error('[Create User] Missing required fields:', missing)
      return NextResponse.json({
        error: `Missing required fields: ${missing.join(', ')}`
      }, { status: 400 })
    }

    // Validate password for new users
    if (!password) {
      console.error('[Create User] Password is required')
      return NextResponse.json({
        error: 'Password is required for new users'
      }, { status: 400 })
    }

    // Use App DB for auth operations
    const appSupabase = createServerSupabaseClient()

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase()
    console.log('[Create User] Normalized email:', normalizedEmail)

    // Check if user already exists in Tenant DB users table
    console.log('[Create User] Checking if user exists in Tenant DB...')
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const tenantSupabase = await getTenantDatabaseClient(tenant_id)
    
    const { data: existingUser } = await tenantSupabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .eq('tenant_id', tenant_id)
      .single()

    if (existingUser) {
      console.error('[Create User] User already exists in users table:', normalizedEmail)
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Check if user already exists in Supabase Auth
    console.log('[Create User] Checking if user exists in Supabase Auth...')
    const { data: existingAuthUsers } = await appSupabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let authUserId: string

    if (existingAuthUser) {
      console.log('[Create User] User exists in Supabase Auth but not in Tenant DB - reusing auth user:', normalizedEmail)
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
        console.error('[Create User] Error updating existing auth user:', updateError)
        return NextResponse.json({ error: `Failed to update auth user: ${updateError.message}` }, { status: 500 })
      }

      authUserId = existingAuthUser.id
      console.log('[Create User] Reusing existing auth user:', authUserId)
    } else {
      // Step 1: Create new auth user in Supabase Auth
      console.log('[Create User] Creating new user in Supabase Auth...')
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
        console.error('[Create User] Supabase Auth error:', authError)
        return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 })
      }

      if (!authData.user) {
        console.error('[Create User] No user returned from Supabase Auth')
        return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
      }

      authUserId = authData.user.id
      console.log('[Create User] User created in Supabase Auth:', authUserId)
    }

    // Step 2: Hash the password for Tenant DB
    console.log('[Create User] Hashing password for Tenant DB...')
    const password_hash = await bcrypt.hash(password, 10)

    // Step 3: Create user record in Tenant DB users table with the auth user's ID
    console.log('[Create User] Creating user record in Tenant DB with ID:', authUserId)
    const { data: user, error: userError } = await tenantSupabase
      .from('users')
      .insert({
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
        job_title,
        department,
        employee_type,
        pay_rate,
        payroll_info,
        hire_date,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship
      })
      .select()
      .single()

    if (userError) {
      console.error('[Create User] Error creating user in Tenant DB:', userError)
      // Rollback: delete the auth user if we can't create the user record (only if it was newly created)
      if (!existingAuthUser) {
        console.log('[Create User] Rolling back newly created Supabase Auth user...')
        await appSupabase.auth.admin.deleteUser(authUserId)
      }
      return NextResponse.json({ error: `Failed to create user record: ${userError.message}` }, { status: 500 })
    }

    console.log('[Create User] User created successfully:', user.id)
    console.log('=== CREATE USER API END (SUCCESS) ===')
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('[Create User] Caught exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}