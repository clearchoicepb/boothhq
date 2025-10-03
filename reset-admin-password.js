#!/usr/bin/env node
// Reset password for admin@clearchoicephotos.com

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

async function resetPassword() {
  const email = 'admin@clearchoicephotos.com'
  const newPassword = 'Admin123!'

  console.log('🔐 Resetting password for', email)
  console.log('📝 New password will be:', newPassword)
  console.log('')

  try {
    // Generate new password hash
    const passwordHash = await bcrypt.hash(newPassword, 10)
    console.log('✅ Generated password hash')

    // Update user password
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()

    if (error) {
      console.error('❌ Error updating password:', error)
      return
    }

    if (!data || data.length === 0) {
      console.error('❌ User not found:', email)
      return
    }

    console.log('✅ Password reset successfully!')
    console.log('')
    console.log('🔑 Login credentials:')
    console.log('   Email:', email)
    console.log('   Password:', newPassword)
    console.log('   Company: clearchoicephotos (or "default" depending on your tenant setup)')
    console.log('')
    console.log('⚠️  Please change this password after logging in!')
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

resetPassword()
