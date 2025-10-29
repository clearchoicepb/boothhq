#!/usr/bin/env node

/**
 * Migrate Missing Records from App DB to Tenant DB
 * 
 * Migrates the specific records that were found to be missing
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

const TABLES_TO_MIGRATE = [
  'accounts',
  'contacts', 
  'contact_accounts',
  'leads'
];

function box(title) {
  const width = 80;
  console.log('\n' + '═'.repeat(width));
  console.log(title);
  console.log('═'.repeat(width));
}

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating: ${tableName}`);
  console.log('─'.repeat(80));

  // Get all records from App DB for this tenant
  const { data: appData, error: appError } = await appDb
    .from(tableName)
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (appError) {
    console.log(`❌ Error reading from App DB: ${appError.message}`);
    return { table: tableName, success: false, migrated: 0 };
  }

  // Get existing records from Tenant DB
  const { data: tenantData, error: tenantError } = await tenantDb
    .from(tableName)
    .select('id')
    .eq('tenant_id', TENANT_ID);

  if (tenantError) {
    console.log(`❌ Error reading from Tenant DB: ${tenantError.message}`);
    return { table: tableName, success: false, migrated: 0 };
  }

  // Find missing records
  const tenantIds = new Set(tenantData.map(r => r.id));
  const missingRecords = appData.filter(r => !tenantIds.has(r.id));

  if (missingRecords.length === 0) {
    console.log(`✅ No missing records - already in sync`);
    return { table: tableName, success: true, migrated: 0 };
  }

  console.log(`   Found ${missingRecords.length} record(s) to migrate`);

  // Migrate using upsert
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
    console.log(`   Hint: ${insertError.hint || 'None'}`);
    return { table: tableName, success: false, migrated: 0 };
  }

  const migratedCount = inserted?.length || missingRecords.length;
  console.log(`✅ Successfully migrated ${migratedCount} record(s)`);

  return { table: tableName, success: true, migrated: migratedCount };
}

async function main() {
  box('MIGRATE MISSING RECORDS');
  console.log('\nMigrating records from Application DB to Tenant DB...');
  console.log(`Tenant ID: ${TENANT_ID}`);

  const results = [];

  for (const table of TABLES_TO_MIGRATE) {
    const result = await migrateTable(table);
    results.push(result);
  }

  // Summary
  box('MIGRATION SUMMARY');

  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  const allSuccess = results.every(r => r.success);

  console.log('');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.table}: ${r.migrated} record(s) migrated`);
  });

  console.log(`\nTotal records migrated: ${totalMigrated}`);

  if (allSuccess && totalMigrated > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: Some of these records were created recently.');
    console.log('   This suggests your application might still be writing to');
    console.log('   the Application DB instead of Tenant DB for some operations.');
    console.log('\n   Run this to check which API routes need fixing:');
    console.log('   node scripts/check-api-database-usage.js');
  } else if (allSuccess) {
    console.log('\n✅ All tables already in sync!');
  } else {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
  }

  console.log('');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});

