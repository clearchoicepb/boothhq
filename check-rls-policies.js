const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLSPolicies() {
  console.log('🔍 Checking Row Level Security (RLS) policies...')
  
  try {
    // Test with anon key (what Vercel would use)
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMTE2MTYsImV4cCI6MjA2OTU4NzYxNn0._L2FisoSi-4IaHmn_hdE0Q4Ptp2RMIepFw0ph567DvI'
    const supabaseAnon = createClient(supabaseUrl, anonKey)
    
    console.log('\n1. Testing with Anon Key (Vercel perspective):')
    
    // Test accessing tenants table
    const { data: tenants, error: tenantsError } = await supabaseAnon
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
    
    if (tenantsError) {
      console.log('❌ Tenants access with anon key:', tenantsError.message)
    } else {
      console.log('✅ Tenants accessible with anon key:', tenants.length, 'records')
    }
    
    // Test accessing users table
    const { data: users, error: usersError } = await supabaseAnon
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
    
    if (usersError) {
      console.log('❌ Users access with anon key:', usersError.message)
    } else {
      console.log('✅ Users accessible with anon key:', users.length, 'records')
    }
    
    // Test authentication flow simulation
    console.log('\n2. Simulating Authentication Flow:')
    
    // Step 1: Get tenant by subdomain
    const { data: tenant, error: tenantError } = await supabaseAnon
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
      .eq('status', 'active')
      .single()
    
    if (tenantError) {
      console.log('❌ Step 1 - Tenant lookup failed:', tenantError.message)
      return
    }
    console.log('✅ Step 1 - Tenant found:', tenant.id)
    
    // Step 2: Get user by email and tenant
    const { data: user, error: userError } = await supabaseAnon
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .single()
    
    if (userError) {
      console.log('❌ Step 2 - User lookup failed:', userError.message)
      console.log('🔧 This is likely the issue! RLS is blocking user access')
      return
    }
    console.log('✅ Step 2 - User found:', user.id)
    
    console.log('\n3. RLS Policy Analysis:')
    console.log('ℹ️  If Step 2 failed, RLS policies are blocking user access')
    console.log('ℹ️  This is common when RLS is enabled but policies are too restrictive')
    
    console.log('\n4. Potential Solutions:')
    console.log('🔧 Option 1: Disable RLS temporarily for testing')
    console.log('🔧 Option 2: Create proper RLS policies for tenant isolation')
    console.log('🔧 Option 3: Use service role key for authentication (not recommended for production)')
    
    console.log('\n5. Recommended RLS Policy:')
    console.log(`
-- Allow users to read their own tenant's data
CREATE POLICY "Users can read own tenant data" ON users
FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Allow tenants to read their own data
CREATE POLICY "Tenants can read own data" ON tenants
FOR SELECT USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
    `)
    
  } catch (error) {
    console.error('❌ RLS check failed:', error)
  }
}

checkRLSPolicies()
