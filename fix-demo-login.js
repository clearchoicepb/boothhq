#!/usr/bin/env node
// Fix demo login credentials for admin@default.com

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixDemoLogin() {
  const email = 'admin@default.com'
  const password = 'password123'

  console.log('🔧 Fixing demo login credentials...\n')

  try {
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
      return
    }

    // Generate password hash
    const passwordHash = await bcrypt.hash(password, 10)
    console.log('✅ Generated password hash for:', password)

    if (!existingUser) {
      console.log('⚠️  User does not exist. Creating admin@default.com...')

      // Get or create default tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', 'default')
        .single()

      if (!tenant) {
        console.error('❌ Default tenant not found. Please create it first.')
        return
      }

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          tenant_id: tenant.id,
          email: email,
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          status: 'active',
          password_hash: passwordHash,
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating user:', createError)
        return
      }

      console.log('✅ User created successfully!')
    } else {
      console.log('✅ User exists. Updating password...')

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (updateError) {
        console.error('❌ Error updating password:', updateError)
        return
      }

      console.log('✅ Password updated successfully!')
    }

    console.log('\n🎉 Demo login is ready!\n')
    console.log('📋 Login credentials:')
    console.log('   URL: http://localhost:3000/auth/signin')
    console.log('   Email:', email)
    console.log('   Password:', password)
    console.log('   Company: default')
    console.log('')
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

fixDemoLogin()
