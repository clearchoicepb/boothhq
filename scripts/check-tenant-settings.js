#!/usr/bin/env node

/**
 * Check tenant_settings Table Status
 *
 * Specifically checks for tenant_settings table and your custom opportunity stages
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTable(db, dbName, tableName) {
  const { data, error } = await db
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single();

  if (error) {
    return { exists: false, error: error.message };
  }

  return { exists: !!data, error: null };
}

async function countRows(db, tableName) {
  const { count, error } = await db
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count, error: null };
}

async function getSettings(db, dbName) {
  const { data, error } = await db
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', TENANT_ID)
    .like('setting_key', 'opportunities.stages%');

  return { data, error };
}

async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('TENANT_SETTINGS TABLE STATUS CHECK', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  // Check if table exists in App DB
  log('Checking Application DB...', 'cyan');
  const appCheck = await checkTable(appDb, 'Application DB', 'tenant_settings');

  if (appCheck.exists) {
    log('✅ tenant_settings EXISTS in Application DB', 'green');

    const appCount = await countRows(appDb, 'tenant_settings');
    if (appCount.error) {
      log(`   ⚠️  Could not count rows: ${appCount.error}`, 'yellow');
    } else {
      log(`   📊 Found ${appCount.count} settings for your tenant`, 'cyan');

      // Try to get opportunity stages
      const appSettings = await getSettings(appDb, 'Application DB');
      if (appSettings.data && appSettings.data.length > 0) {
        log(`   🎯 Found ${appSettings.data.length} opportunity stage settings`, 'green');
        log('\n   Your custom stages ARE in Application DB:', 'yellow');
        appSettings.data.forEach(s => {
          const value = typeof s.setting_value === 'object' ? JSON.stringify(s.setting_value) : s.setting_value;
          log(`      ${s.setting_key}: ${value.substring(0, 80)}...`, 'cyan');
        });
      }
    }
  } else {
    log('❌ tenant_settings MISSING from Application DB', 'red');
  }

  // Check if table exists in Tenant DB
  log('\nChecking Tenant DB...', 'cyan');
  const tenantCheck = await checkTable(tenantDb, 'Tenant DB', 'tenant_settings');

  if (tenantCheck.exists) {
    log('✅ tenant_settings EXISTS in Tenant DB', 'green');

    const tenantCount = await countRows(tenantDb, 'tenant_settings');
    if (tenantCount.error) {
      log(`   ⚠️  Could not count rows: ${tenantCount.error}`, 'yellow');
    } else {
      log(`   📊 Found ${tenantCount.count} settings for your tenant`, 'cyan');

      // Try to get opportunity stages
      const tenantSettings = await getSettings(tenantDb, 'Tenant DB');
      if (tenantSettings.data && tenantSettings.data.length > 0) {
        log(`   🎯 Found ${tenantSettings.data.length} opportunity stage settings`, 'green');
      } else {
        log('   ⚠️  No opportunity stage settings found', 'yellow');
      }
    }
  } else {
    log('❌ tenant_settings MISSING from Tenant DB', 'red');
    log('   🚨 THIS IS THE PROBLEM!', 'red');
  }

  // Check opportunities in custom stage
  log('\n' + '='.repeat(80), 'blue');
  log('OPPORTUNITIES IN CUSTOM STAGE', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  const { data: opps, error: oppsError } = await tenantDb
    .from('opportunities')
    .select('id, name, stage, amount')
    .eq('tenant_id', TENANT_ID)
    .eq('stage', 'stage_1761253720446');

  if (oppsError) {
    log(`Error querying opportunities: ${oppsError.message}`, 'red');
  } else if (opps.length === 0) {
    log('No opportunities found in stage_1761253720446', 'yellow');
    log('(They may have been moved or stage ID is different)', 'yellow');
  } else {
    log(`Found ${opps.length} opportunities in stage_1761253720446:`, 'green');
    opps.forEach(opp => {
      log(`  - ${opp.name} ($${opp.amount || 0})`, 'cyan');
    });
  }

  // Summary
  log('\n' + '='.repeat(80), 'blue');
  log('DIAGNOSIS', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  if (tenantCheck.exists) {
    log('✅ tenant_settings table exists in Tenant DB', 'green');
    log('The settings API should work.', 'green');
    log('\nIf you\'re still getting 500 errors, check:', 'yellow');
    log('  1. Database connection credentials', 'yellow');
    log('  2. Row Level Security (RLS) policies', 'yellow');
    log('  3. Server logs for detailed error', 'yellow');
  } else if (appCheck.exists) {
    log('🚨 PROBLEM IDENTIFIED:', 'red');
    log('   tenant_settings exists in Application DB but NOT in Tenant DB', 'red');
    log('\nFIX:', 'yellow');
    log('   1. Create tenant_settings table in Tenant DB', 'yellow');
    log('   2. Migrate settings data from Application DB', 'yellow');
    log('   3. Verify settings API works', 'yellow');
    log('\nRun: node scripts/migrate-tenant-settings.js', 'green');
  } else {
    log('🚨 CRITICAL: tenant_settings missing from BOTH databases!', 'red');
    log('   Table needs to be created and populated', 'red');
  }

  log('\n');
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
