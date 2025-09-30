const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUserCreation() {
  console.log('🔧 Fixing user creation...')
  
  try {
    // First, let's see what columns actually exist in the users table
    console.log('Checking existing user structure...')
    
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error checking users:', usersError)
      return
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('Existing user columns:', Object.keys(existingUsers[0]))
    }
    
    // Check if admin user already exists
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
      console.log('✅ Admin user already exists')
      console.log('User details:', {
        id: adminUser.id,
        email: adminUser.email,
        tenant_id: adminUser.tenant_id,
        status: adminUser.status,
        has_password_hash: !!adminUser.password_hash
      })
      
      // Test password
      if (adminUser.password_hash) {
        const isValid = await bcrypt.compare('password123', adminUser.password_hash)
        console.log('Password test:', isValid ? 'PASS' : 'FAIL')
      }
      
      return
    }
    
    // Create user with only the columns that exist
    console.log('Creating admin user...')
    
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const userData = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@default.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      status: 'active',
      password_hash: hashedPassword
    }
    
    // Remove columns that might not exist
    delete userData.is_active
    delete userData.permissions
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating user:', createError)
      return
    }
    
    console.log('✅ Admin user created successfully')
    console.log('User ID:', newUser.id)
    console.log('Email:', newUser.email)
    
    // Test authentication
    console.log('\n🧪 Testing authentication...')
    const testAuth = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440000')
      .single()
    
    if (testAuth.data) {
      const isValid = await bcrypt.compare('password123', testAuth.data.password_hash)
      console.log('✅ Authentication test:', isValid ? 'PASS' : 'FAIL')
    }
    
    console.log('\n🎉 User creation fixed!')
    console.log('\n📋 Login Credentials:')
    console.log('   Company Subdomain: default')
    console.log('   Email: admin@default.com')
    console.log('   Password: password123')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixUserCreation()

