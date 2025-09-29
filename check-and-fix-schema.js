const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndFixSchema() {
  console.log('🔍 Checking database schema...')
  
  try {
    // Check if users table exists and what columns it has
    console.log('Checking users table structure...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error checking users table:', usersError)
      return
    }
    
    console.log('✅ Users table exists')
    
    // Check if tenants table exists
    console.log('Checking tenants table...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1)
    
    if (tenantsError) {
      console.error('Error checking tenants table:', tenantsError)
      return
    }
    
    console.log('✅ Tenants table exists')
    
    // Check if we have the default tenant
    console.log('Checking for default tenant...')
    const { data: defaultTenant, error: defaultTenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
      .single()
    
    if (defaultTenantError && defaultTenantError.code !== 'PGRST116') {
      console.error('Error checking default tenant:', defaultTenantError)
      return
    }
    
    if (!defaultTenant) {
      console.log('Creating default tenant...')
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert({
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Default Company',
          subdomain: 'default',
          plan: 'professional',
          status: 'active'
        })
        .select()
        .single()
      
      if (createTenantError) {
        console.error('Error creating tenant:', createTenantError)
        return
      }
      console.log('✅ Default tenant created')
    } else {
      console.log('✅ Default tenant exists')
    }
    
    // Check if we have the default user
    console.log('Checking for default user...')
    const { data: defaultUser, error: defaultUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .single()
    
    if (defaultUserError && defaultUserError.code !== 'PGRST116') {
      console.error('Error checking default user:', defaultUserError)
      return
    }
    
    if (!defaultUser) {
      console.log('Creating default user...')
      
      // Hash the password properly
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: '550e8400-e29b-41d4-a716-446655440001',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'admin@default.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          status: 'active',
          password_hash: hashedPassword,
          is_active: true,
          permissions: {}
        })
        .select()
        .single()
      
      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return
      }
      console.log('✅ Default user created')
    } else {
      console.log('✅ Default user exists')
      console.log('User details:', {
        id: defaultUser.id,
        email: defaultUser.email,
        is_active: defaultUser.is_active,
        has_password_hash: !!defaultUser.password_hash
      })
    }
    
    // Test authentication
    console.log('\n🧪 Testing authentication...')
    
    const testUser = defaultUser || await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .single()
    
    if (testUser.data) {
      console.log('✅ User found:', testUser.data.email)
      console.log('✅ Has password hash:', !!testUser.data.password_hash)
      console.log('✅ Is active:', testUser.data.is_active)
      
      // Test password verification
      const isValid = await bcrypt.compare('password123', testUser.data.password_hash)
      console.log('✅ Password verification:', isValid ? 'PASS' : 'FAIL')
    }
    
    console.log('\n🎉 Schema check complete!')
    console.log('\n📋 Login Credentials:')
    console.log('   Company Subdomain: default')
    console.log('   Email: admin@default.com')
    console.log('   Password: password123')
    
  } catch (error) {
    console.error('❌ Error checking schema:', error)
  }
}

checkAndFixSchema()
