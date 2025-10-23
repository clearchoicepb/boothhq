#!/usr/bin/env node
/**
 * Set Opportunity Owner Script
 * 
 * Safely assigns all unowned opportunities to Bryan Santos
 * and defaults new opportunities to logged-in user
 */

const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in .env.local')
  process.exit(1)
}

async function setOpportunityOwner() {
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

    // Step 1: Find Bryan Santos
    console.log('🔍 Looking for Bryan Santos...')
    const userResult = await client.query(`
      SELECT id, first_name, last_name, email, tenant_id
      FROM users
      WHERE first_name ILIKE '%Bryan%' 
        AND last_name ILIKE '%Santos%'
    `)

    if (userResult.rows.length === 0) {
      console.error('❌ Could not find Bryan Santos')
      console.log('📋 Available users:')
      const allUsers = await client.query('SELECT first_name, last_name, email FROM users ORDER BY first_name')
      allUsers.rows.forEach(u => console.log(`  - ${u.first_name} ${u.last_name} (${u.email})`))
      process.exit(1)
    }

    const bryanId = userResult.rows[0].id
    const tenantId = userResult.rows[0].tenant_id
    console.log(`✅ Found: ${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`)
    console.log(`   Email: ${userResult.rows[0].email}`)
    console.log(`   ID: ${bryanId}`)
    console.log(`   Tenant: ${tenantId}\n`)

    // Step 2: Count opportunities without owner
    console.log('📊 Checking opportunities without owner...')
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE owner_id IS NULL
        AND tenant_id = $1
    `, [tenantId])

    const unownedCount = parseInt(countResult.rows[0].count)
    console.log(`📌 Found ${unownedCount} opportunities without owner\n`)

    if (unownedCount === 0) {
      console.log('✅ All opportunities already have owners!')
      console.log('   No changes needed.')
      await client.end()
      process.exit(0)
    }

    // Step 3: Preview what will be updated
    console.log('🔍 Sample opportunities that will be updated:')
    const sampleResult = await client.query(`
      SELECT id, name, stage, created_at
      FROM opportunities
      WHERE owner_id IS NULL
        AND tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [tenantId])

    sampleResult.rows.forEach((opp, i) => {
      console.log(`  ${i + 1}. ${opp.name} (${opp.stage}) - Created: ${opp.created_at.toLocaleDateString()}`)
    })

    // Step 4: Confirm before proceeding
    console.log(`\n⚠️  READY TO UPDATE ${unownedCount} OPPORTUNITIES`)
    console.log(`   This will set owner_id = '${bryanId}' for all opportunities with owner_id IS NULL`)
    console.log(`\n   Press Ctrl+C to cancel, or waiting 5 seconds to proceed...\n`)
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Step 5: Perform the update
    console.log('🚀 Updating opportunities...')
    const updateResult = await client.query(`
      UPDATE opportunities
      SET owner_id = $1, updated_at = NOW()
      WHERE owner_id IS NULL
        AND tenant_id = $2
      RETURNING id, name, stage
    `, [bryanId, tenantId])

    console.log(`✅ Successfully updated ${updateResult.rows.length} opportunities!\n`)
    
    // Step 6: Verify
    console.log('🔍 Verifying update...')
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE owner_id IS NULL
        AND tenant_id = $1
    `, [tenantId])

    const remainingUnowned = parseInt(verifyResult.rows[0].count)
    
    if (remainingUnowned === 0) {
      console.log('✅ PERFECT! All opportunities now have owners')
    } else {
      console.warn(`⚠️  Warning: ${remainingUnowned} opportunities still without owner`)
    }

    // Show final stats
    console.log('\n📊 Final Statistics:')
    const finalStats = await client.query(`
      SELECT 
        owner_id,
        u.first_name,
        u.last_name,
        COUNT(*) as opportunity_count
      FROM opportunities o
      LEFT JOIN users u ON o.owner_id = u.id
      WHERE o.tenant_id = $1
      GROUP BY owner_id, u.first_name, u.last_name
      ORDER BY opportunity_count DESC
    `, [tenantId])

    finalStats.rows.forEach(stat => {
      const ownerName = stat.first_name ? `${stat.first_name} ${stat.last_name}` : 'Unassigned'
      console.log(`  ${ownerName}: ${stat.opportunity_count} opportunities`)
    })

    console.log('\n✅ Script completed successfully!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

setOpportunityOwner()

