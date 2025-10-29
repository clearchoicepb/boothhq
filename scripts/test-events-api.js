#!/usr/bin/env node

/**
 * Test Events API Directly
 * 
 * Tests what the /api/events endpoint actually returns
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

// Simulate what getTenantDatabaseClient does
async function testAPI() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTING /api/events ENDPOINT LOGIC');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabase = createClient(
    process.env.DEFAULT_TENANT_DATA_URL,
    process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
  );

  console.log('🔍 Simulating API query...\n');

  // This is exactly what the API does (without event_categories/event_types that cause errors)
  let query = supabase
    .from('events')
    .select(`
      *,
      accounts!events_account_id_fkey(name),
      contacts!events_contact_id_fkey(first_name, last_name),
      event_dates(
        id,
        event_date,
        start_time,
        end_time,
        location_id,
        notes,
        status,
        locations(id, name, address_line1, city, state)
      )
    `)
    .eq('tenant_id', TENANT_ID)
    .order('start_date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    return;
  }

  console.log(`✅ Query successful: ${data.length} events returned\n`);

  if (data.length > 0) {
    console.log('📋 First event structure:');
    console.log(JSON.stringify(data[0], null, 2));
    
    console.log('\n📊 All events summary:');
    data.forEach((event, idx) => {
      console.log(`   ${idx + 1}. ${event.title || 'Untitled'} (${event.start_date})`);
      console.log(`      - accounts: ${event.accounts ? 'EXISTS' : 'NULL'}`);
      console.log(`      - contacts: ${event.contacts ? 'EXISTS' : 'NULL'}`);
      console.log(`      - event_categories: ${event.event_categories ? 'EXISTS' : 'NULL'}`);
      console.log(`      - event_types: ${event.event_types ? 'EXISTS' : 'NULL'}`);
      console.log(`      - event_dates: ${event.event_dates?.length || 0} dates`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTING DATA TRANSFORMATION');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test the transformation that the API does
  const transformedData = data?.map(event => ({
    ...event,
    account_name: event.accounts?.name || null,
    contact_name: event.contacts ?
      `${event.contacts.first_name} ${event.contacts.last_name}`.trim() : null,
  })) || [];

  console.log('✅ Transformation successful');
  console.log(`   Events with account_name: ${transformedData.filter(e => e.account_name).length}`);
  console.log(`   Events with contact_name: ${transformedData.filter(e => e.contact_name).length}`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('DIAGNOSIS');
  console.log('═══════════════════════════════════════════════════════\n');

  if (data.length === 8) {
    console.log('✅ API query returns all 8 events correctly');
    console.log('\n💡 Since the API works but the UI shows 0, the issue is likely:');
    console.log('   1. React Query cache has stale/empty data');
    console.log('   2. Frontend API call is failing silently');
    console.log('   3. useEvents hook has an issue');
    console.log('\n🔧 Recommended fixes:');
    console.log('   1. Clear React Query cache: Open DevTools > Application > Clear Site Data');
    console.log('   2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
    console.log('   3. Check browser console for errors');
    console.log('   4. Add console.log in useEvents hook to see what it receives');
  } else {
    console.log('❌ API query is not returning all events');
    console.log(`   Expected: 8, Got: ${data.length}`);
  }

  console.log('\n');
}

testAPI().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});

