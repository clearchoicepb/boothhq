const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminUser() {
  console.log('👤 Creating admin user...')
  
  try {
    // First, ensure the default tenant exists
    console.log('Ensuring default tenant exists...')
    
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
      .single()
    
    if (tenantError && tenantError.code !== 'PGRST116') {
      console.error('Error checking tenant:', tenantError)
      return
    }
    
    if (!tenant) {
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
    
    // Create admin user with basic schema
    console.log('Creating admin user...')
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@default.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        status: 'active'
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating user:', createError)
      return
    }
    
    console.log('✅ Admin user created successfully!')
    console.log('User details:', {
      id: newUser.id,
      email: newUser.email,
      tenant_id: newUser.tenant_id,
      role: newUser.role,
      status: newUser.status
    })
    
    console.log('\n🎉 Setup complete!')
    console.log('\n📋 Login Credentials:')
    console.log('   Company Subdomain: default')
    console.log('   Email: admin@default.com')
    console.log('   Password: password123')
    
    console.log('\n⚠️  Note: The authentication system expects password_hash and is_active columns.')
    console.log('   You may need to update the auth.ts file to work with the current schema.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createAdminUser()

