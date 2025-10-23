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
    const migrationPath = 'supabase/migrations/20251023000001_fix_notes_entity_types.sql'

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migration = fs.readFileSync(migrationPath, 'utf8')
    console.log('✅ Migration file loaded\n')

    console.log('🚀 Executing migration...')
    await client.query(migration)
    console.log('✅ Migration executed successfully!\n')

    // Verify the constraint was updated
    console.log('🔍 Verifying notes table constraint...')
    const result = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conname = 'notes_entity_type_check'
    `)

    if (result.rows.length > 0) {
      console.log('✅ Constraint updated successfully!')
      console.log('📋 New constraint definition:')
      console.log(result.rows[0].constraint_definition)
    } else {
      console.error('⚠️  Constraint not found - may need manual verification')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

applyMigration()

