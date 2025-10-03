#!/usr/bin/env node
// Refresh PostgREST schema cache to fix "body column not found" error

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function refreshSchema() {
  try {
    console.log('🔄 Refreshing PostgREST schema cache...')

    // Execute the NOTIFY command to refresh schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "NOTIFY pgrst, 'reload schema';"
    })

    if (error) {
      // If RPC doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, trying alternative...')
      console.log('\n📋 Manual fix required:')
      console.log('1. Go to your Supabase Dashboard')
      console.log('2. Open SQL Editor')
      console.log('3. Run this command:')
      console.log('\n   NOTIFY pgrst, \'reload schema\';\n')
      console.log('This will refresh the schema cache and fix the "body column" error.')
    } else {
      console.log('✅ Schema cache refreshed successfully!')
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('\n📋 Manual fix required:')
    console.log('Go to Supabase Dashboard → SQL Editor and run:')
    console.log('   NOTIFY pgrst, \'reload schema\';')
  }
}

refreshSchema()
