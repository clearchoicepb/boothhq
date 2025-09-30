const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserSchema() {
  try {
    console.log('🔍 Checking user table schema...')
    
    // Try to get any existing user to see the actual column names
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      
      // If no users exist, let's try to create one with different field names
      console.log('\n🔄 Trying to create user with different password field...')
      
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
      
      if (tenants && tenants.length > 0) {
        const tenantId = tenants[0].id
        
        // Try with 'password' instead of 'password_hash'
        const testData1 = {
          email: 'test1@example.com',
          password: 'password123',
          first_name: 'Test1',
          last_name: 'User',
          role: 'event_staff',
          tenant_id: tenantId
        }
        
        console.log('Trying with "password" field:', testData1)
        
        const { error: error1 } = await supabase
          .from('users')
          .insert(testData1)
        
        if (error1) {
          console.log('❌ "password" field failed:', error1.message)
          
          // Try with no password field at all
          const testData2 = {
            email: 'test2@example.com',
            first_name: 'Test2',
            last_name: 'User',
            role: 'event_staff',
            tenant_id: tenantId
          }
          
          console.log('\nTrying without password field:', testData2)
          
          const { error: error2 } = await supabase
            .from('users')
            .insert(testData2)
          
          if (error2) {
            console.log('❌ No password field failed:', error2.message)
          } else {
            console.log('✅ Success without password field!')
          }
        } else {
          console.log('✅ Success with "password" field!')
        }
      }
    } else if (users.length > 0) {
      console.log('✅ Found existing user, columns are:')
      console.log(Object.keys(users[0]))
      
      // Check if password_hash exists
      if ('password_hash' in users[0]) {
        console.log('✅ password_hash column exists')
      } else if ('password' in users[0]) {
        console.log('✅ password column exists (not password_hash)')
      } else {
        console.log('❌ No password column found')
      }
    } else {
      console.log('No users found, but table exists')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkUserSchema()
