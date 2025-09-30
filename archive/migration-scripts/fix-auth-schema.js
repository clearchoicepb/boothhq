const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAuthSchema() {
  console.log('🔧 Fixing authentication schema...')
  
  try {
    // Add missing fields to users table
    console.log('Adding missing columns to users table...')
    
    const { data: alterResult, error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add missing fields to users table
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
      `
    })
    
    if (alterError) {
      console.error('Error adding columns:', alterError)
      return
    }
    
    console.log('✅ Columns added successfully')
    
    // Insert default tenant
    console.log('Creating default tenant...')
    const { data: tenantResult, error: tenantError } = await supabase
      .from('tenants')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Default Company',
        subdomain: 'default',
        plan: 'professional',
        status: 'active'
      })
    
    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      return
    }
    
    console.log('✅ Default tenant created')
    
    // Insert default user
    console.log('Creating default user...')
    const { data: userResult, error: userError } = await supabase
      .from('users')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@default.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        status: 'active',
        password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
        is_active: true,
        permissions: {}
      })
    
    if (userError) {
      console.error('Error creating user:', userError)
      return
    }
    
    console.log('✅ Default user created')
    
    // Insert default settings
    console.log('Creating default settings...')
    const settings = [
      { tenant_id: '550e8400-e29b-41d4-a716-446655440000', setting_key: 'accounts.view', setting_value: '"table"' },
      { tenant_id: '550e8400-e29b-41d4-a716-446655440000', setting_key: 'contacts.view', setting_value: '"table"' },
      { tenant_id: '550e8400-e29b-41d4-a716-446655440000', setting_key: 'leads.view', setting_value: '"table"' },
      { tenant_id: '550e8400-e29b-41d4-a716-446655440000', setting_key: 'events.view', setting_value: '"table"' },
      { tenant_id: '550e8400-e29b-41d4-a716-446655440000', setting_key: 'invoices.view', setting_value: '"table"' }
    ]
    
    const { data: settingsResult, error: settingsError } = await supabase
      .from('tenant_settings')
      .upsert(settings, { onConflict: 'tenant_id,setting_key' })
    
    if (settingsError) {
      console.error('Error creating settings:', settingsError)
      return
    }
    
    console.log('✅ Default settings created')
    
    console.log('\n🎉 Authentication schema fixed successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('   Company Subdomain: default')
    console.log('   Email: admin@default.com')
    console.log('   Password: password123')
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error)
  }
}

fixAuthSchema()

