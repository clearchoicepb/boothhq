#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const tenantUrl = process.env.DEFAULT_TENANT_DATA_URL;
const tenantKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY;
const tenantId = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

if (!tenantUrl || !tenantKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const tenantDb = createClient(tenantUrl, tenantKey);

async function main() {
  console.log('\n🔍 DIAGNOSING LOCATIONS TABLE ISSUE\n');
  console.log('='.repeat(70));
  
  // 1. Check existing locations
  console.log('\n1️⃣  CHECKING EXISTING LOCATIONS...\n');
  const { data: existingLocations, error: selectError } = await tenantDb
    .from('locations')
    .select('id, name, city, state, tenant_id, created_at')
    .eq('tenant_id', tenantId)
    .limit(10);

  if (selectError) {
    console.error('❌ Error fetching locations:', selectError.message);
    console.error('   Code:', selectError.code);
    console.error('   Details:', selectError.details);
    
    if (selectError.code === 'PGRST204' || selectError.message.includes('not found')) {
      console.error('\n💡 DIAGNOSIS: locations table does NOT exist in Tenant DB');
      console.error('   Migration was never run or failed');
    }
  } else if (!existingLocations || existingLocations.length === 0) {
    console.log('⚠️  locations table EXISTS but contains NO DATA');
    console.log('   This confirms data is NOT being saved');
  } else {
    console.log(`✅ Found ${existingLocations.length} existing locations:`);
    existingLocations.forEach(loc => {
      console.log(`   - ${loc.name} (${loc.city || 'no city'}, ${loc.state || 'no state'})`);
      console.log(`     Created: ${loc.created_at}`);
    });
  }

  // 2. Test INSERT operation
  console.log('\n2️⃣  TESTING INSERT OPERATION...\n');
  
  const testLocation = {
    tenant_id: tenantId,
    name: `TEST LOCATION ${Date.now()}`,
    address_line1: '123 Test St',
    city: 'Test City',
    state: 'TS',
    postal_code: '12345',
    country: 'US',
    is_one_time: true,
    notes: 'This is a diagnostic test location - can be deleted'
  };

  console.log('   Attempting to insert test location...');
  console.log('   Data:', JSON.stringify(testLocation, null, 2));
  
  const { data: insertedLocation, error: insertError } = await tenantDb
    .from('locations')
    .insert(testLocation)
    .select()
    .single();

  if (insertError) {
    console.error('\n❌ INSERT FAILED!');
    console.error('   Error Code:', insertError.code);
    console.error('   Error Message:', insertError.message);
    if (insertError.details) {
      console.error('   Details:', insertError.details);
    }
    if (insertError.hint) {
      console.error('   Hint:', insertError.hint);
    }
    
    // Diagnose specific errors
    if (insertError.code === '23503') {
      console.error('\n💡 DIAGNOSIS: Foreign Key Constraint Violation');
      console.error('   The locations table likely has a FK to tenants table');
      console.error('   This is a CROSS-DATABASE FK which is NOT ALLOWED');
      console.error('\n   ✅ FIX: Remove the tenants FK constraint from locations table');
    } else if (insertError.code === '42501' || insertError.message.includes('policy')) {
      console.error('\n💡 DIAGNOSIS: Row Level Security Policy Blocking Insert');
      console.error('   RLS policies might be checking auth.jwt()');
      console.error('\n   ✅ FIX: Update RLS policies or use service role key properly');
    } else if (insertError.code === 'PGRST204' || insertError.message.includes('not found')) {
      console.error('\n💡 DIAGNOSIS: locations table does NOT exist');
      console.error('\n   ✅ FIX: Run the migration to create the table');
    } else {
      console.error('\n💡 UNKNOWN ERROR - needs further investigation');
    }
  } else {
    console.log('\n✅ INSERT SUCCEEDED!');
    console.log('   Created location:', insertedLocation.name);
    console.log('   Location ID:', insertedLocation.id);
    console.log('   Tenant ID:', insertedLocation.tenant_id);
    
    // Clean up test location
    console.log('\n   Cleaning up test location...');
    const { error: deleteError } = await tenantDb
      .from('locations')
      .delete()
      .eq('id', insertedLocation.id);
    
    if (deleteError) {
      console.error('   ⚠️  Could not delete test location:', deleteError.message);
    } else {
      console.log('   ✅ Test location deleted');
    }
  }

  // 3. Check if we can query without tenant_id filter
  console.log('\n3️⃣  CHECKING ALL LOCATIONS (WITHOUT TENANT FILTER)...\n');
  const { data: allLocations, error: allError } = await tenantDb
    .from('locations')
    .select('id, name, tenant_id')
    .limit(5);

  if (allError) {
    console.error('❌ Error fetching all locations:', allError.message);
  } else if (!allLocations || allLocations.length === 0) {
    console.log('   No locations found at all (table is empty)');
  } else {
    console.log(`   Found ${allLocations.length} locations total:`);
    allLocations.forEach(loc => {
      console.log(`   - ${loc.name} (tenant: ${loc.tenant_id})`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ DIAGNOSIS COMPLETE\n');
}

main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});


