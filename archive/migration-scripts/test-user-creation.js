const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUserCreation() {
  try {
    console.log('🧪 Testing user creation...')
    
    // First, let's see what the current users table structure looks like
    console.log('\n📋 Current users:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else if (users.length > 0) {
      console.log('Sample user fields:', Object.keys(users[0]))
    }
    
    // Get a tenant ID
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ No tenants found')
      return
    }
    
    const tenantId = tenants[0].id
    console.log('Using tenant ID:', tenantId)
    
    // Try to create a test user with minimal fields
    console.log('\n🔄 Creating test user...')
    const testUserData = {
      email: 'test@example.com',
      password_hash: 'password123',
      first_name: 'Test',
      last_name: 'User',
      role: 'event_staff',
      tenant_id: tenantId
    }
    
    console.log('Test user data:', testUserData)
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(testUserData)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ User creation failed:', createError)
      console.log('Error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
    } else {
      console.log('✅ User created successfully:', newUser.email)
      
      // Clean up - delete the test user
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id)
      
      console.log('🧹 Test user cleaned up')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testUserCreation()
