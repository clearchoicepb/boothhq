import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { ROLES, isAdmin, type UserRole } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query Tenant DB for users (users table is now in Tenant DB)
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    // Get all users for the current tenant
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
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
      return NextResponse.json({
        error: 'Missing required fields: email, first_name, last_name'
      }, { status: 400 })
    }

    // Validate password for new users
    if (!password) {
      return NextResponse.json({
        error: 'Password is required for new users'
      }, { status: 400 })
    }

    // Use App DB for auth operations
    const appSupabase = createServerSupabaseClient()

    // Check if user already exists in auth.users
    const { data: existingAuthUsers } = await appSupabase.auth.admin.listUsers()
    const authUserExists = existingAuthUsers?.users?.some(u => u.email === email)

    if (authUserExists) {
      return NextResponse.json({ error: 'User with this email already exists in auth system' }, { status: 400 })
    }

    // Check if user already exists in Tenant DB users table
    const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
    const tenantSupabase = await getTenantDatabaseClient(tenant_id)
    
    const { data: existingUser } = await tenantSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenant_id)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Step 1: Create auth user in Supabase Auth
    const { data: authData, error: authError } = await appSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name,
        last_name,
        tenant_id
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
    }

    // Step 2: Create user record in Tenant DB users table with the auth user's ID
    const { data: user, error: userError } = await tenantSupabase
      .from('users')
      .insert({
        id: authData.user.id, // Use the auth user's ID
        email,
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
      console.error('Error creating user record:', userError)
      // Rollback: delete the auth user if we can't create the user record
      await appSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: `Failed to create user record: ${userError.message}` }, { status: 500 })
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}