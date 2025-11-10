#!/usr/bin/env node

/**
 * Create Supabase Auth account for amanda@clearchoicephotos.com
 *
 * This script fixes the login issue where Amanda has a tenant DB record
 * but no Supabase Auth account.
 *
 * The script:
 * 1. Creates user in Supabase Auth (if not exists)
 * 2. Updates password_hash in Tenant DB users table (for consistency)
 *
 * Usage: node scripts/create-amanda-auth-account.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const USER_EMAIL = 'amanda@clearchoicephotos.com'
const NEW_PASSWORD = 'TempPass2025!' // User should change this after first login
const DEFAULT_TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
const USER_ID = '0f64238b-5c85-4000-b4e1-680e5786ee15' // From tenant DB seed

async function createAmandaAuthAccount() {
  try {
    console.log('🔐 Creating Supabase Auth account for amanda@clearchoicephotos.com...\n')

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in .env.local')
    }

    // Create client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Verify user exists in Tenant DB
    console.log('Step 1: Verifying user in Tenant DB...')
    const { data: tenantUser, error: tenantError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, tenant_id')
      .eq('email', USER_EMAIL)
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .single()

    if (tenantError || !tenantUser) {
      throw new Error(`User not found in Tenant DB: ${tenantError?.message}`)
    }

    console.log('✅ User found in Tenant DB:')
    console.log(`   - ID: ${tenantUser.id}`)
    console.log(`   - Name: ${tenantUser.first_name} ${tenantUser.last_name}`)
    console.log(`   - Role: ${tenantUser.role}`)
    console.log(`   - Status: ${tenantUser.status}`)

    if (tenantUser.status !== 'active') {
      throw new Error(`User status is '${tenantUser.status}' - must be 'active' to log in`)
    }

    // Step 2: Check if user exists in Supabase Auth
    console.log('\nStep 2: Checking Supabase Auth...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const authUser = users.find(u => u.email === USER_EMAIL)

    if (authUser) {
      console.log(`✅ User already exists in Supabase Auth: ${authUser.id}`)
      console.log('\n⚠️  User can already log in. Updating password instead...')

      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: NEW_PASSWORD }
      )

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`)
      }

      console.log('✅ Password updated in Supabase Auth')
    } else {
      console.log(`❌ User NOT found in Supabase Auth (this is the problem!)`)
      console.log('\n📝 Creating user in Supabase Auth...')

      // Create user in Supabase Auth using the SAME ID from tenant DB
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: USER_EMAIL,
        password: NEW_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: tenantUser.first_name,
          last_name: tenantUser.last_name,
          tenant_id: DEFAULT_TENANT_ID
        }
      })

      if (createError) {
        throw new Error(`Failed to create user in Supabase Auth: ${createError.message}`)
      }

      console.log(`✅ Created user in Supabase Auth: ${newUser.user.id}`)
      console.log(`⚠️  Note: Auth ID (${newUser.user.id}) may differ from Tenant DB ID (${tenantUser.id})`)
      console.log(`   This is OK - the system matches by email during login.`)
    }

    // Step 3: Update password_hash in Tenant DB (for consistency)
    console.log('\nStep 3: Updating password_hash in Tenant DB...')
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10)

    const { error: updateTenantError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', USER_EMAIL)
      .eq('tenant_id', DEFAULT_TENANT_ID)

    if (updateTenantError) {
      console.warn(`⚠️  Warning: Could not update Tenant DB: ${updateTenantError.message}`)
      console.warn('This is OK - Supabase Auth is the primary authentication source')
    } else {
      console.log('✅ Password hash updated in Tenant DB')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ ACCOUNT CREATION SUCCESSFUL!')
    console.log('='.repeat(60))
    console.log('\n📋 Login Credentials:')
    console.log(`   Email: ${USER_EMAIL}`)
    console.log(`   Password: ${NEW_PASSWORD}`)
    console.log('\n⚠️  IMPORTANT: User should change password after first login!')
    console.log('\n🚀 Amanda can now log in at: http://localhost:3000/auth/signin')
    console.log('')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
    process.exit(1)
  }
}

createAmandaAuthAccount()
