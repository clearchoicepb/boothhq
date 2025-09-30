const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function applyMigration() {
  console.log('Applying password_hash column migration...\n')

  // Read the migration file
  const migration = fs.readFileSync('supabase/migrations/20250930000000_add_password_hash.sql', 'utf8')

  try {
    // Execute the migration using Supabase's RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql: migration })
    
    if (error) {
      console.error('Error applying migration:', error)
      console.log('\nTrying alternative method...')
      
      // Alternative: use direct SQL execution
      const { error: altError } = await supabase
        .from('users')
        .select('password_hash')
        .limit(1)
      
      if (altError && altError.message.includes('column "password_hash" does not exist')) {
        console.log('Column does not exist yet. Migration needs to be applied manually.')
        console.log('Please run this SQL in your Supabase SQL Editor:')
        console.log('\n' + migration)
        return false
      } else {
        console.log('Column already exists or other issue:', altError)
      }
    } else {
      console.log('Migration applied successfully!')
    }
  } catch (err) {
    console.error('Exception:', err)
  }

  // Verify the column was added
  console.log('\nVerifying password_hash column exists...')
  const { data: users, error: verifyError } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .limit(1)

  if (verifyError) {
    console.error('Verification failed:', verifyError)
    return false
  } else {
    console.log('✅ Verification successful! Column exists.')
    console.log('Sample query result:', users)
    return true
  }
}

applyMigration().catch(console.error)
