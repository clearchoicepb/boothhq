#!/usr/bin/env node
const { Client } = require('pg')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in .env.local')
  process.exit(1)
}

async function applyMigration() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('🔧 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully\n')

    console.log('📝 Reading migration file...')
    const migrationPath = 'supabase/migrations/20250204000000_create_contracts.sql'

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migration = fs.readFileSync(migrationPath, 'utf8')
    console.log('✅ Migration file loaded\n')

    console.log('🚀 Executing migration...')
    await client.query(migration)
    console.log('✅ Migration executed successfully!\n')

    // Verify the table was created
    console.log('🔍 Verifying contracts table...')
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'contracts'
      ORDER BY ordinal_position
    `)

    if (result.rows.length > 0) {
      console.log('✅ Contracts table created with', result.rows.length, 'columns:')
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.error('❌ Table verification failed')
    }

    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. The contracts table is now ready to track contracts')
    console.log('2. Contract status tracking is enabled (draft, sent, viewed, signed, declined, expired)')
    console.log('3. Contract numbers will be auto-generated (e.g., CONTRACT-2025-001)')
    console.log('')

  } catch (err) {
    console.error('❌ Error applying migration:', err.message)
    console.error('\nFull error:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

applyMigration()
