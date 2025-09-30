const { createServerSupabaseClient } = require('./src/lib/supabase-client')
const bcrypt = require('bcryptjs')

async function testAuthentication() {
  console.log('Testing Authentication Flow...\n')
  console.log('='.repeat(60))
  
  const credentials = {
    email: 'admin@clearchoicephotos.com',
    password: 'Cl3@rCh01c3!2025$',
    tenant: 'default'
  }
  
  const supabase = createServerSupabaseClient()
  
  // Step 1: Get tenant
  console.log('Step 1: Looking up tenant...')
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', credentials.tenant)
    .eq('status', 'active')
    .single()

  if (tenantError || !tenant) {
    console.error('❌ Tenant lookup failed:', tenantError)
    return
  }
  console.log('✅ Tenant found:', tenant.name)

  // Step 2: Get user
  console.log('\nStep 2: Looking up user...')
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', credentials.email)
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .single()

  if (userError || !user) {
    console.error('❌ User lookup failed:', userError)
    return
  }
  console.log('✅ User found:', user.email)

  // Step 3: Verify password
  console.log('\nStep 3: Verifying password...')
  if (!user.password_hash) {
    console.error('❌ User has no password hash')
    return
  }
  console.log('✅ Password hash exists')

  const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash)
  if (!isValidPassword) {
    console.error('❌ Password verification failed')
    return
  }
  console.log('✅ Password verified successfully')

  console.log('\n' + '='.repeat(60))
  console.log('🎉 AUTHENTICATION TEST PASSED!')
  console.log('='.repeat(60))
  console.log('\nYou can now log in with:')
  console.log('  Email:', credentials.email)
  console.log('  Password:', credentials.password)
  console.log('  Tenant:', credentials.tenant)
  console.log('\nStart the dev server with: npm run dev')
  console.log('Then go to: http://localhost:3000/auth/signin')
}

testAuthentication().catch(console.error)
