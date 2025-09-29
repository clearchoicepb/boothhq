const { createClient } = require('@supabase/supabase-js')

// Test with the same credentials that work locally
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseVercelAuth() {
  console.log('🔍 Diagnosing Vercel authentication issues...')
  
  try {
    // Check if the admin user exists
    console.log('1. Checking if admin user exists...')
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .single()
    
    if (adminError) {
      console.error('❌ Admin user not found:', adminError)
      console.log('\n🔧 SOLUTION: The admin user needs to be created on the production database')
      return
    }
    
    console.log('✅ Admin user exists:', {
      id: adminUser.id,
      email: adminUser.email,
      tenant_id: adminUser.tenant_id,
      status: adminUser.status
    })
    
    // Check if the default tenant exists
    console.log('\n2. Checking if default tenant exists...')
    
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
      .single()
    
    if (tenantError) {
      console.error('❌ Default tenant not found:', tenantError)
      console.log('\n🔧 SOLUTION: The default tenant needs to be created on the production database')
      return
    }
    
    console.log('✅ Default tenant exists:', {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      status: tenant.status
    })
    
    // Check if user belongs to the tenant
    console.log('\n3. Checking user-tenant relationship...')
    
    if (adminUser.tenant_id !== tenant.id) {
      console.error('❌ User-tenant mismatch:', {
        user_tenant_id: adminUser.tenant_id,
        tenant_id: tenant.id
      })
      console.log('\n🔧 SOLUTION: Update user tenant_id to match the tenant')
    } else {
      console.log('✅ User-tenant relationship is correct')
    }
    
    // Test authentication flow
    console.log('\n4. Testing authentication flow...')
    
    // Simulate the auth check that happens in the API
    const { data: authTest, error: authError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .single()
    
    if (authError) {
      console.error('❌ Authentication test failed:', authError)
    } else {
      console.log('✅ Authentication test passed')
    }
    
    console.log('\n🎯 DIAGNOSIS COMPLETE')
    console.log('\n📋 Most Likely Issues:')
    console.log('1. ❌ Environment variables not set in Vercel')
    console.log('2. ❌ Database schema differences between local and production')
    console.log('3. ❌ Missing admin user or tenant in production database')
    console.log('4. ❌ Different Supabase project being used')
    
    console.log('\n🔧 SOLUTIONS:')
    console.log('1. Check Vercel environment variables')
    console.log('2. Run the database migration on production')
    console.log('3. Create admin user and tenant on production')
    console.log('4. Verify Supabase project configuration')
    
  } catch (error) {
    console.error('❌ Diagnosis error:', error)
  }
}

diagnoseVercelAuth()

