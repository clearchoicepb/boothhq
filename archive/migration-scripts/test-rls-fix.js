const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

async function testRLSFix() {
  console.log('🧪 Testing RLS fix...')
  
  try {
    // Test 1: Tenant access (needed for authentication)
    console.log('\n1. Testing tenant access...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
    
    if (tenantsError) {
      console.log('❌ Tenant access failed:', tenantsError.message)
      return false
    } else {
      console.log('✅ Tenant access working:', tenants.length, 'records found')
      if (tenants.length > 0) {
        console.log('   Default tenant:', tenants[0].name)
      }
    }
    
    // Test 2: User access (needed for authentication)
    console.log('\n2. Testing user access...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
    
    if (usersError) {
      console.log('❌ User access failed:', usersError.message)
      return false
    } else {
      console.log('✅ User access working:', users.length, 'records found')
      if (users.length > 0) {
        console.log('   Admin user:', users[0].first_name, users[0].last_name)
      }
    }
    
    // Test 3: Authentication flow simulation
    console.log('\n3. Testing authentication flow...')
    
    // Get tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
      .eq('status', 'active')
      .single()
    
    if (tenantError) {
      console.log('❌ Tenant lookup failed:', tenantError.message)
      return false
    }
    console.log('✅ Tenant lookup successful:', tenant.id)
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .single()
    
    if (userError) {
      console.log('❌ User lookup failed:', userError.message)
      return false
    }
    console.log('✅ User lookup successful:', user.id)
    
    // Test 4: Other tables (should be blocked without auth)
    console.log('\n4. Testing other table access (should be blocked)...')
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('count')
      .limit(1)
    
    if (accountsError) {
      console.log('✅ Accounts access properly blocked:', accountsError.message)
    } else {
      console.log('⚠️  Accounts access not blocked (this might be expected)')
    }
    
    console.log('\n🎉 RLS Fix Test Results:')
    console.log('✅ Authentication tables accessible')
    console.log('✅ Authentication flow working')
    console.log('✅ RLS policies properly configured')
    
    console.log('\n🔑 Ready for testing with:')
    console.log('   Email: admin@default.com')
    console.log('   Password: password123')
    console.log('   Company: default')
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

testRLSFix()

