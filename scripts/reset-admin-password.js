#!/usr/bin/env node

/**
 * Reset admin@default.com password in BOTH Supabase Auth and Tenant DB
 * 
 * This script:
 * 1. Updates the password in Supabase Auth (for login)
 * 2. Updates password_hash in Tenant DB users table (for consistency)
 * 
 * Usage: node scripts/reset-admin-password.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const ADMIN_EMAIL = 'admin@default.com'
const NEW_PASSWORD = 'password123'
const DEFAULT_TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18'

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetting admin@default.com password...\n')

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in .env.local')
    }

    // Create client (same instance for both App DB and Tenant DB)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Get user from Supabase Auth
    console.log('Step 1: Looking up user in Supabase Auth...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const authUser = users.find(u => u.email === ADMIN_EMAIL)
    
    if (!authUser) {
      console.log(`❌ User ${ADMIN_EMAIL} not found in Supabase Auth`)
      console.log('\n📝 Creating user in Supabase Auth...')
      
      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: NEW_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Admin',
          last_name: 'User'
        }
      })

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`)
      }

      console.log(`✅ Created user in Supabase Auth: ${newUser.user.id}`)
    } else {
      console.log(`✅ Found user in Supabase Auth: ${authUser.id}`)
      
      // Step 2: Update password in Supabase Auth
      console.log('\nStep 2: Updating password in Supabase Auth...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: NEW_PASSWORD }
      )

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`)
      }

      console.log('✅ Password updated in Supabase Auth')
    }

    // Step 3: Update password_hash in users table (optional - kept for consistency)
    console.log('\nStep 3: Updating password_hash in users table...')
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10)
    
    const { data: tenantUser, error: tenantError } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', ADMIN_EMAIL)
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .select()
      .single()

    if (tenantError) {
      console.warn(`⚠️  Warning: Could not update users table: ${tenantError.message}`)
      console.warn('This is OK if you only use Supabase Auth for authentication')
    } else {
      console.log('✅ Password hash updated in users table')
    }

    // Step 4: Verify user exists in users table
    console.log('\nStep 4: Verifying user in users table...')
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, tenant_id')
      .eq('email', ADMIN_EMAIL)
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .single()

    if (verifyError || !verifyUser) {
      console.error(`❌ User not found in users table!`)
      console.error('You may need to run the user creation migration.')
      console.error('Check: supabase/migrations/20250920154308_fix_auth_fields.sql')
    } else {
      console.log('✅ User verified in users table:')
      console.log(`   - Name: ${verifyUser.first_name} ${verifyUser.last_name}`)
      console.log(`   - Role: ${verifyUser.role}`)
      console.log(`   - Status: ${verifyUser.status}`)
      console.log(`   - Tenant ID: ${verifyUser.tenant_id}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ PASSWORD RESET SUCCESSFUL!')
    console.log('='.repeat(50))
    console.log('\n📋 Login Credentials:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${NEW_PASSWORD}`)
    console.log(`   Tenant: default`)
    console.log('\n🚀 You can now log in at: http://localhost:3000/auth/signin')
    console.log('')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
    process.exit(1)
  }
}

resetAdminPassword()

