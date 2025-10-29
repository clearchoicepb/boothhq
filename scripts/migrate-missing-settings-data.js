#!/usr/bin/env node

/**
 * Migrate Missing Settings Data to Tenant DB
 * 
 * Migrates configuration/settings tables that have data in App DB
 * but are missing or incomplete in Tenant DB
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

// Tables that likely need data migration (settings/configuration tables)
const SETTINGS_TABLES = [
  'design_statuses',
  'event_types',
  'event_categories',
  'core_task_templates',
  'opportunity_status_settings',
  'lead_sources',
  'industries'
];

async function checkAndMigrate(tableName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Table: ${tableName}`);
  console.log('='.repeat(80));

  // Get data from App DB
  const { data: appData, error: appError } = await appDb
    .from(tableName)
    .select('*');

  if (appError) {
    console.log(`⚠️  Cannot read from App DB: ${appError.message}`);
    return;
  }

  // Get data from Tenant DB
  const { data: tenantData, error: tenantError } = await tenantDb
    .from(tableName)
    .select('*');

  if (tenantError) {
    console.log(`⚠️  Cannot read from Tenant DB: ${tenantError.message}`);
    return;
  }

  console.log(`📊 App DB: ${appData.length} rows`);
  console.log(`📊 Tenant DB: ${tenantData.length} rows`);

  // Check if migration is needed
  if (appData.length === 0) {
    console.log('ℹ️  No data to migrate');
    return;
  }

  if (appData.length === tenantData.length) {
    console.log('✅ Row counts match - no migration needed');
    return;
  }

  // Find missing records
  const tenantIds = new Set(tenantData.map(r => r.id));
  const missingRecords = appData.filter(r => !tenantIds.has(r.id));

  console.log(`\n🔍 Found ${missingRecords.length} missing record(s) in Tenant DB`);

  if (missingRecords.length === 0) {
    console.log('✅ All records exist (row count difference may be due to extra records in Tenant DB)');
    return;
  }

  // Ask for confirmation (non-interactive - will migrate automatically)
  console.log('\n📝 Migrating missing records...');

  const { data: inserted, error: insertError } = await tenantDb
    .from(tableName)
    .upsert(missingRecords, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select();

  if (insertError) {
    console.log(`❌ Error migrating: ${insertError.message}`);
    console.log(`   Code: ${insertError.code}`);
    return;
  }

  console.log(`✅ Successfully migrated ${inserted?.length || missingRecords.length} record(s)`);
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('MIGRATE MISSING SETTINGS DATA');
  console.log('═'.repeat(80));

  console.log('\n📋 Checking and migrating settings/configuration tables...\n');

  for (const table of SETTINGS_TABLES) {
    await checkAndMigrate(table);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ MIGRATION COMPLETE');
  console.log('═'.repeat(80));
  console.log('\n💡 Run "node scripts/compare-databases.js" to verify results\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});

