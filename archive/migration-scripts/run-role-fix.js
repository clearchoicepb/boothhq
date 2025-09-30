const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runRoleFix() {
  try {
    console.log('🔧 Running role system fix...')
    
    // Read the SQL file
    const fs = require('fs')
    const sqlContent = fs.readFileSync('fix_roles_manual.sql', 'utf8')
    
    console.log('📄 SQL to execute:')
    console.log(sqlContent)
    
    // Try to execute the SQL using a different approach
    console.log('\n🚀 Attempting to execute SQL...')
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`\nExecuting: ${statement.substring(0, 50)}...`)
        
        try {
          // Try using the REST API to execute SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ sql: statement })
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('✅ Success:', result)
          } else {
            console.log('❌ Error:', await response.text())
          }
        } catch (err) {
          console.log('❌ Execution error:', err.message)
        }
      }
    }
    
    // Test the fix
    console.log('\n🧪 Testing the fix...')
    const testRoles = ['sales_rep', 'operations_manager', 'event_staff']
    
    for (const role of testRoles) {
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: role })
          .eq('email', 'admin@default.com')
        
        if (updateError) {
          console.log(`❌ Role '${role}' - Still not working:`, updateError.message)
        } else {
          console.log(`✅ Role '${role}' - Now working!`)
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
    
  } catch (error) {
    console.error('Error:', error)
  }
}

runRoleFix()
