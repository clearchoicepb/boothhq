#!/usr/bin/env node

/**
 * Diagnose Settings API 500 Error
 *
 * Checks common issues after tenant_settings migration
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('SETTINGS API 500 ERROR DIAGNOSTIC', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  // Test 1: Can we connect to tenant DB?
  log('Test 1: Checking Tenant DB connection...', 'cyan');
  try {
    const { data, error } = await tenantDb
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (error) {
      log(`❌ Cannot connect to Tenant DB: ${error.message}`, 'red');
      log('   Check DEFAULT_TENANT_DATA_URL and DEFAULT_TENANT_DATA_SERVICE_KEY in .env.local', 'yellow');
      return;
    }
    log('✅ Tenant DB connection OK', 'green');
  } catch (err) {
    log(`❌ Connection error: ${err.message}`, 'red');
    return;
  }

  // Test 2: Does tenant_settings table exist?
  log('\nTest 2: Checking if tenant_settings table exists...', 'cyan');
  const { data: tableCheck, error: tableError } = await tenantDb
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', 'tenant_settings')
    .single();

  if (tableError || !tableCheck) {
    log('❌ tenant_settings table does NOT exist in Tenant DB', 'red');
    log('   Run: node scripts/migrate-tenant-settings.js', 'yellow');
    return;
  }
  log('✅ tenant_settings table exists', 'green');

  // Test 3: Can we query the table?
  log('\nTest 3: Checking table permissions...', 'cyan');
  try {
    const { data, error } = await tenantDb
      .from('tenant_settings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID);

    if (error) {
      log(`❌ Cannot query tenant_settings: ${error.message}`, 'red');
      log(`   Error code: ${error.code}`, 'red');

      if (error.code === '42501') {
        log('\n   🚨 RLS POLICY ISSUE!', 'yellow');
        log('   The Row Level Security policy is blocking access.', 'yellow');
        log('   Using service role key should bypass RLS, but something is wrong.', 'yellow');
      }
      return;
    }

    log(`✅ Can query table (${data || 0} rows for your tenant)`, 'green');
  } catch (err) {
    log(`❌ Query error: ${err.message}`, 'red');
    return;
  }

  // Test 4: Does data exist?
  log('\nTest 4: Checking for settings data...', 'cyan');
  const { data: settings, error: settingsError } = await tenantDb
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (settingsError) {
    log(`❌ Error reading settings: ${settingsError.message}`, 'red');
    return;
  }

  if (!settings || settings.length === 0) {
    log('❌ No settings data found for your tenant!', 'red');
    log('   The table exists but is empty.', 'yellow');
    log('   Run: node scripts/migrate-tenant-settings.js', 'yellow');
    return;
  }

  log(`✅ Found ${settings.length} settings`, 'green');

  // Test 5: Can we read opportunity stages?
  log('\nTest 5: Checking opportunity stages...', 'cyan');
  const stageSettings = settings.filter(s => s.setting_key.startsWith('opportunities.stages'));

  if (stageSettings.length === 0) {
    log('⚠️  No opportunity stage settings found', 'yellow');
  } else {
    log(`✅ Found ${stageSettings.length} opportunity stage settings`, 'green');

    const stagesArray = settings.find(s => s.setting_key === 'opportunities.stages');
    if (stagesArray && Array.isArray(stagesArray.setting_value)) {
      log(`   ${stagesArray.setting_value.length} stages configured`, 'cyan');
    }
  }

  // Test 6: Simulate what the API does
  log('\nTest 6: Simulating Settings API logic...', 'cyan');
  try {
    const { data: apiTest, error: apiError } = await tenantDb
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', TENANT_ID);

    if (apiError) {
      log(`❌ API simulation failed: ${apiError.message}`, 'red');
      return;
    }

    // Try to build settings object (like the API does)
    const settingsObject = apiTest.reduce((acc, setting) => {
      const keys = setting.setting_key.split('.');
      let current = acc;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = setting.setting_value;
      return acc;
    }, {});

    log('✅ Settings object built successfully', 'green');
    log(`   Keys: ${Object.keys(settingsObject).join(', ')}`, 'cyan');

    if (settingsObject.opportunities) {
      log('   ✅ opportunities settings present', 'green');
    }
  } catch (err) {
    log(`❌ Simulation error: ${err.message}`, 'red');
    log(`   This error would cause the API to return 500`, 'yellow');
  }

  // Summary
  log('\n' + '='.repeat(80), 'blue');
  log('DIAGNOSIS COMPLETE', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  log('If all tests passed but API still returns 500:', 'yellow');
  log('1. Check server logs (terminal running npm run dev)', 'yellow');
  log('2. Restart your dev server: pkill -f "next dev" && npm run dev', 'yellow');
  log('3. Clear browser cache and hard refresh (Cmd+Shift+R)', 'yellow');
  log('4. Check if .env.local was loaded (restart required after changes)', 'yellow');
  log('\nTo see actual error, check your server terminal output.', 'cyan');
  log('\n');
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
