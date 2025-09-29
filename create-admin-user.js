const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminUser() {
  try {
    console.log('👤 Creating admin user...')
    
    // First, create a tenant if it doesn't exist
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'default')
      .single()
    
    let tenantId
    if (tenantError && tenantError.code === 'PGRST116') {
      console.log('Creating default tenant...')
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Company',
          subdomain: 'default',
          status: 'active'
        })
        .select()
        .single()
      
      if (createTenantError) {
        console.error('Error creating tenant:', createTenantError)
        return
      }
      
      tenantId = newTenant.id
      console.log('✅ Tenant created:', tenantId)
    } else if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
      return
    } else {
      tenantId = tenant.id
      console.log('✅ Using existing tenant:', tenantId)
    }
    
    // Create admin user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: 'admin@default.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        password_hash: 'password123', // In production, this should be hashed
        is_active: true,
        status: 'active'
      })
      .select()
      .single()
    
    if (userError) {
      console.error('Error creating user:', userError)
    } else {
      console.log('✅ Admin user created:', user.email, 'with role:', user.role)
    }
    
    // Test the role system
    console.log('\n🧪 Testing role system...')
    const testRoles = ['sales_rep', 'operations_manager', 'event_staff', 'manager', 'user']
    
    for (const role of testRoles) {
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: role })
          .eq('email', 'admin@default.com')
        
        if (updateError) {
          console.log(`❌ Role '${role}' - Failed:`, updateError.message)
        } else {
          console.log(`✅ Role '${role}' - Working!`)
          // Revert back to admin
          await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('email', 'admin@default.com')
        }
      } catch (err) {
        console.log(`❌ Role '${role}' - Error:`, err.message)
      }
    }
    
    console.log('\n🎉 Setup complete!')
    console.log('You can now login with:')
    console.log('  Email: admin@default.com')
    console.log('  Password: password123')
    console.log('  Tenant: default')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

createAdminUser()