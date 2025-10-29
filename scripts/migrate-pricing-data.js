#!/usr/bin/env node

/**
 * Migrate pricing data (packages, add_ons, opportunity_line_items) from App DB to Tenant DB
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const appKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tenantUrl = process.env.DEFAULT_TENANT_DATA_URL
const tenantKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY

if (!appUrl || !appKey || !tenantUrl || !tenantKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const appDb = createClient(appUrl, appKey)
const tenantDb = createClient(tenantUrl, tenantKey)

async function migratePricingData() {
  console.log('📦 Migrating pricing data from App DB to Tenant DB...\n')

  try {
    // ============================================================================
    // STEP 1: Migrate packages
    // ============================================================================
    console.log('1️⃣ Migrating packages...')
    
    const { data: packages, error: packagesError } = await appDb
      .from('packages')
      .select('*')
    
    if (packagesError) {
      console.error('   ❌ Error fetching packages:', packagesError.message)
    } else if (!packages || packages.length === 0) {
      console.log('   ⚪ No packages to migrate')
    } else {
      console.log(`   Found ${packages.length} packages in App DB`)
      
      const { error: insertError } = await tenantDb
        .from('packages')
        .upsert(packages, { onConflict: 'id' })
      
      if (insertError) {
        console.error('   ❌ Error inserting packages:', insertError.message)
      } else {
        console.log(`   ✅ Migrated ${packages.length} packages`)
      }
    }

    // ============================================================================
    // STEP 2: Migrate add_ons
    // ============================================================================
    console.log('\n2️⃣ Migrating add_ons...')
    
    const { data: addOns, error: addOnsError } = await appDb
      .from('add_ons')
      .select('*')
    
    if (addOnsError) {
      console.error('   ❌ Error fetching add_ons:', addOnsError.message)
    } else if (!addOns || addOns.length === 0) {
      console.log('   ⚪ No add_ons to migrate')
    } else {
      console.log(`   Found ${addOns.length} add_ons in App DB`)
      
      const { error: insertError } = await tenantDb
        .from('add_ons')
        .upsert(addOns, { onConflict: 'id' })
      
      if (insertError) {
        console.error('   ❌ Error inserting add_ons:', insertError.message)
      } else {
        console.log(`   ✅ Migrated ${addOns.length} add_ons`)
      }
    }

    // ============================================================================
    // STEP 3: Migrate opportunity_line_items (nullify old package/add-on refs)
    // ============================================================================
    console.log('\n3️⃣ Migrating opportunity_line_items...')
    
    const { data: lineItems, error: lineItemsError } = await appDb
      .from('opportunity_line_items')
      .select('*')
    
    if (lineItemsError) {
      console.error('   ❌ Error fetching opportunity_line_items:', lineItemsError.message)
    } else if (!lineItems || lineItems.length === 0) {
      console.log('   ⚪ No opportunity_line_items to migrate')
    } else {
      console.log(`   Found ${lineItems.length} line items in App DB`)
      
      // Get existing package and add_on IDs in Tenant DB
      const { data: existingPackages } = await tenantDb
        .from('packages')
        .select('id')
      
      const { data: existingAddOns } = await tenantDb
        .from('add_ons')
        .select('id')
      
      const packageIds = new Set((existingPackages || []).map(p => p.id))
      const addOnIds = new Set((existingAddOns || []).map(a => a.id))
      
      // Clean up line items: set package_id/add_on_id to NULL if they reference non-existent items
      const cleanedLineItems = lineItems.map(item => {
        const cleaned = { ...item }
        
        if (item.package_id && !packageIds.has(item.package_id)) {
          console.log(`   ⚠️  Line item ${item.id}: nullifying package_id (old package not migrated)`)
          cleaned.package_id = null
        }
        
        if (item.add_on_id && !addOnIds.has(item.add_on_id)) {
          console.log(`   ⚠️  Line item ${item.id}: nullifying add_on_id (old add-on not migrated)`)
          cleaned.add_on_id = null
        }
        
        return cleaned
      })
      
      const { error: insertError } = await tenantDb
        .from('opportunity_line_items')
        .upsert(cleanedLineItems, { onConflict: 'id' })
      
      if (insertError) {
        console.error('   ❌ Error inserting opportunity_line_items:', insertError.message)
        console.error('   Details:', insertError)
      } else {
        console.log(`   ✅ Migrated ${cleanedLineItems.length} line items (with old refs nullified)`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Pricing data migration complete!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  }
}

migratePricingData().catch(console.error)

