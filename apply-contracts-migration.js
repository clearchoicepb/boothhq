#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function applyMigration() {
  console.log('🔧 Applying contracts table migration...\n')

  // Read the migration file
  const migrationPath = 'supabase/migrations/20250204000000_create_contracts.sql'

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migration = fs.readFileSync(migrationPath, 'utf8')

  // Split the migration into individual statements
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    console.log(`Executing statement ${i + 1}/${statements.length}...`)

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        // Check if it's just a "already exists" error which we can ignore
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Already exists (skipping): ${error.message}`)
        } else {
          console.error(`❌ Error on statement ${i + 1}:`, error.message)
          console.log('Statement:', statement.substring(0, 100) + '...')
          // Continue with other statements
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    } catch (err) {
      console.error(`❌ Exception on statement ${i + 1}:`, err.message)
    }
  }

  // Verify the table was created
  console.log('\n🔍 Verifying contracts table exists...')
  const { data, error: verifyError } = await supabase
    .from('contracts')
    .select('id')
    .limit(1)

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message)
    console.log('\n💡 You may need to apply this migration manually in Supabase SQL Editor.')
    console.log('Migration file location:', migrationPath)
    return false
  } else {
    console.log('✅ Verification successful! Contracts table exists.')
    console.log('\n🎉 Migration completed successfully!')
    return true
  }
}

applyMigration()
  .then(success => {
    if (success) {
      console.log('\n📋 Next steps:')
      console.log('1. The contracts table is now ready to track contracts')
      console.log('2. Contract status tracking is enabled (draft, sent, viewed, signed, declined, expired)')
      console.log('3. Contract numbers will be auto-generated (e.g., CONTRACT-2025-001)')
      console.log('')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
