const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixTenantAndUser() {
  console.log('🔧 Fixing tenant and user setup...')
  
  try {
    // Check what tenants exist
    console.log('Checking existing tenants...')
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
    
    if (tenantsError) {
      console.error('Error checking tenants:', tenantsError)
      return
    }
    
    console.log('Existing tenants:', tenants)
    
    let defaultTenant = tenants.find(t => t.subdomain === 'default')
    
    if (!defaultTenant) {
      console.log('Creating default tenant...')
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert({
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
      
      defaultTenant = newTenant
      console.log('✅ Default tenant created:', defaultTenant.id)
    } else {
      console.log('✅ Default tenant found:', defaultTenant.id)
    }
    
    // Check if admin user exists
    console.log('Checking for admin user...')
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .single()
    
    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Error checking admin user:', adminError)
      return
    }
    
    if (adminUser) {
      console.log('✅ Admin user already exists:', adminUser.id)
      return
    }
    
    // Create admin user
    console.log('Creating admin user...')
    
    const { data: newUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        tenant_id: defaultTenant.id,
        email: 'admin@default.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        status: 'active'
      })
      .select()
      .single()
    
    if (createUserError) {
      console.error('Error creating user:', createUserError)
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
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixTenantAndUser()

