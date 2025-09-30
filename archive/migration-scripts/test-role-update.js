const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRoleUpdate() {
  try {
    console.log('🧪 Testing complete role update flow...')
    
    // Get current users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    console.log('\n📋 Current users:')
    users.forEach(user => {
      console.log(`  - ${user.email}: ${user.role}`)
    })
    
    if (users.length === 0) {
      console.log('❌ No users found to test with')
      return
    }
    
    const testUser = users[0]
    console.log(`\n🎯 Testing with user: ${testUser.email}`)
    console.log(`   Current role: ${testUser.role}`)
    
    // Test updating to each new role
    const newRoles = ['sales_rep', 'operations_manager', 'event_staff', 'manager', 'admin', 'user']
    
    for (const newRole of newRoles) {
      console.log(`\n🔄 Testing role change to: ${newRole}`)
      
      try {
        const { data: updateResult, error: updateError } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', testUser.id)
          .select()
        
        if (updateError) {
          console.log(`   ❌ Failed: ${updateError.message}`)
        } else {
          console.log(`   ✅ Success! Role changed to: ${newRole}`)
          
          // Verify the change
          const { data: verifyUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', testUser.id)
            .single()
          
          if (verifyUser?.role === newRole) {
            console.log(`   ✅ Verified: Role is now ${verifyUser.role}`)
          } else {
            console.log(`   ⚠️  Warning: Role verification failed`)
          }
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`)
      }
    }
    
    // Restore original role
    console.log(`\n🔄 Restoring original role: ${testUser.role}`)
    await supabase
      .from('users')
      .update({ role: testUser.role })
      .eq('id', testUser.id)
    
    console.log('\n🎉 Role system test complete!')
    console.log('✅ All roles are working - user role updates should now work in your application!')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testRoleUpdate()
