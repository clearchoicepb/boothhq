const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUsersSchema() {
  console.log('🔍 Checking users table schema...')
  
  try {
    // Try to get any existing users to see the schema
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error checking users table:', usersError)
      
      // If no users exist, let's try to create one with minimal data
      console.log('No users found, attempting to create with minimal schema...')
      
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
        console.error('Error creating minimal user:', createError)
        console.log('Available columns might be:', [
          'id', 'tenant_id', 'email', 'first_name', 'last_name', 'role', 'status'
        ])
      } else {
        console.log('✅ Minimal user created:', newUser)
      }
      
      return
    }
    
    if (users && users.length > 0) {
      console.log('✅ Found existing users')
      console.log('Available columns:', Object.keys(users[0]))
      console.log('Sample user:', users[0])
    } else {
      console.log('No users found in table')
    }
    
    // Check if admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@default.com')
      .single()
    
    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Error checking admin user:', adminError)
    } else if (adminUser) {
      console.log('✅ Admin user exists:', {
        id: adminUser.id,
        email: adminUser.email,
        tenant_id: adminUser.tenant_id,
        status: adminUser.status
      })
    } else {
      console.log('❌ Admin user does not exist')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkUsersSchema()

