#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const tenantUrl = process.env.DEFAULT_TENANT_DATA_URL;
const tenantServiceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY;
const tenantId = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

if (!tenantUrl || !tenantServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const tenantDb = createClient(tenantUrl, tenantServiceKey);

async function main() {
  console.log('\n🧪 TESTING INSERT + SELECT with RLS\n');
  console.log('='.repeat(70));
  
  console.log('\n1️⃣  Testing INSERT with .select() chained...\n');
  
  const testLocation = {
    tenant_id: tenantId,
    name: `RLS Test ${Date.now()}`,
    city: 'Test City',
    state: 'OH'
  };
  
  console.log('   Inserting:', testLocation.name);
  
  // This is EXACTLY what the API route does
  const { data, error } = await tenantDb
    .from('locations')
    .insert(testLocation)
    .select()  // ← This is the critical part
    .single();

  if (error) {
    console.error('\n❌ FAILED!');
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    console.error('   Details:', error.details);
    
    if (error.code === '42501') {
      console.error('\n💡 ROOT CAUSE FOUND!');
      console.error('   RLS policy is blocking the SELECT after INSERT');
      console.error('   The data DOES save, but we cannot read it back');
      console.error('   This makes the API return 500 even though insert succeeded');
    }
  } else if (!data) {
    console.error('\n❌ INSERT succeeded but SELECT returned no data!');
    console.error('\n💡 ROOT CAUSE FOUND!');
    console.error('   The insert worked, but RLS blocked the select');
    console.error('   This is why:');
    console.error('   - Data appears in database');
    console.error('   - But API returns error');
    console.error('   - UI shows error message');
    console.error('   - Location does not appear in form');
  } else {
    console.log('\n✅ SUCCESS!');
    console.log('   Location ID:', data.id);
    console.log('   Location Name:', data.name);
    console.log('\n   If this works, the RLS policy is NOT the issue');
    
    // Cleanup
    await tenantDb.from('locations').delete().eq('id', data.id);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📋 CONCLUSION\n');
  console.log('If the test FAILED:');
  console.log('  → Run: scripts/fix-locations-rls-policy.sql on Tenant DB');
  console.log('\nIf the test SUCCEEDED:');
  console.log('  → The issue is somewhere else (frontend state management?)');
  console.log('  → Check browser console and network tab');
  console.log('\n' + '='.repeat(70));
}

main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

