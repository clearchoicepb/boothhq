#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const tenantUrl = process.env.DEFAULT_TENANT_DATA_URL;
const tenantServiceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY;
const tenantAnonKey = process.env.DEFAULT_TENANT_DATA_ANON_KEY;
const tenantId = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

if (!tenantUrl || !tenantServiceKey || !tenantAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const serviceClient = createClient(tenantUrl, tenantServiceKey);
const anonClient = createClient(tenantUrl, tenantAnonKey);

async function main() {
  console.log('\n🔍 CHECKING RLS POLICIES ON LOCATIONS TABLE\n');
  console.log('='.repeat(70));
  
  // 1. Test with SERVICE ROLE KEY (bypasses RLS)
  console.log('\n1️⃣  TEST INSERT + SELECT WITH SERVICE ROLE KEY...\n');
  
  const testData1 = {
    tenant_id: tenantId,
    name: `TEST RLS ${Date.now()}`,
    city: 'Test City',
    state: 'TS'
  };
  
  const { data: serviceResult, error: serviceError } = await serviceClient
    .from('locations')
    .insert(testData1)
    .select()
    .single();

  if (serviceError) {
    console.error('❌ SERVICE ROLE INSERT FAILED:', serviceError.message);
  } else if (!serviceResult) {
    console.error('❌ SERVICE ROLE INSERT succeeded but SELECT returned no data!');
  } else {
    console.log('✅ SERVICE ROLE: Insert + Select WORKED');
    console.log('   Location ID:', serviceResult.id);
    console.log('   Location Name:', serviceResult.name);
    
    // Cleanup
    await serviceClient.from('locations').delete().eq('id', serviceResult.id);
  }

  // 2. Test with ANON KEY (subject to RLS)
  console.log('\n2️⃣  TEST INSERT + SELECT WITH ANON KEY (simulates API)...\n');
  
  const testData2 = {
    tenant_id: tenantId,
    name: `TEST ANON ${Date.now()}`,
    city: 'Test City',
    state: 'TS'
  };
  
  const { data: anonResult, error: anonError } = await anonClient
    .from('locations')
    .insert(testData2)
    .select()
    .single();

  if (anonError) {
    console.error('❌ ANON KEY INSERT FAILED:', anonError.message);
    console.error('   Code:', anonError.code);
    console.error('   Details:', anonError.details);
    
    if (anonError.code === '42501') {
      console.error('\n💡 DIAGNOSIS: RLS POLICY IS BLOCKING!');
      console.error('   The RLS policy is using auth.jwt() which is not available');
      console.error('   for anon key requests without a JWT token');
    }
  } else if (!anonResult) {
    console.error('❌ ANON KEY INSERT succeeded but SELECT returned no data!');
    console.error('\n💡 DIAGNOSIS: RLS allows INSERT but blocks SELECT!');
    console.error('   This causes the API to return 500 even though data is saved');
    console.error('\n   This is the ROOT CAUSE of the UI issue!');
  } else {
    console.log('✅ ANON KEY: Insert + Select WORKED');
    console.log('   Location ID:', anonResult.id);
    console.log('   Location Name:', anonResult.name);
    
    // Cleanup
    await serviceClient.from('locations').delete().eq('id', anonResult.id);
  }

  // 3. Check RLS policy details
  console.log('\n3️⃣  CHECKING RLS POLICY CONFIGURATION...\n');
  
  const { data: policies, error: policyError } = await serviceClient.rpc('exec_sql', {
    query: `
      SELECT 
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'locations';
    `
  }).catch(() => ({ data: null, error: { message: 'Could not query policies directly' } }));

  if (policyError || !policies) {
    console.log('   (Could not retrieve policy details via RPC)');
  } else {
    console.log('   RLS Policies:');
    policies.forEach(p => {
      console.log(`   - ${p.policyname}`);
      console.log(`     Command: ${p.cmd}`);
      console.log(`     Roles: ${p.roles}`);
      console.log(`     Using: ${p.qual || 'N/A'}`);
      console.log(`     With Check: ${p.with_check || 'N/A'}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ RLS CHECK COMPLETE\n');
}

main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});


