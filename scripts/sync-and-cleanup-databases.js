#!/usr/bin/env node

/**
 * Sync and Cleanup Databases
 *
 * This script:
 * 1. Finds NEW data in application DB (created after migration)
 * 2. Migrates it to tenant DB
 * 3. Optionally cleans up business data from application DB
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

// Create clients
const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Business data tables (to check for new data)
const BUSINESS_TABLES = [
  'accounts',
  'contacts',
  'contact_accounts',
  'leads',
  'opportunities',
  'opportunity_line_items',
  'locations',
  'events',
  'event_dates',
  'invoices',
  'invoice_line_items',
  'payments',
  'quotes',
  'quote_line_items',
  'tasks',
  'notes',
  'attachments',
  'communications',
  'contracts',
  'templates',
];

// Ask user for confirmation
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function getTableCounts(db, tableName) {
  const { data, error, count } = await db
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);

  if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
    return { count: 0, error: error.message };
  }

  return { count: count || 0 };
}

async function getTableData(db, tableName) {
  const { data, error } = await db
    .from(tableName)
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (error && error.code !== 'PGRST116') {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}

async function migrateNewData(tableName, newRecords) {
  if (newRecords.length === 0) {
    log(`  ↳ No new records`, 'yellow');
    return { success: true, count: 0 };
  }

  try {
    const { data: result, error } = await tenantDb
      .from(tableName)
      .upsert(newRecords, { onConflict: 'id' });

    if (error) {
      log(`  ✗ Error: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }

    log(`  ✓ Migrated ${newRecords.length} new records`, 'green');
    return { success: true, count: newRecords.length };
  } catch (error) {
    log(`  ✗ Exception: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function compareAndSync() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🔄 Database Sync & Cleanup Tool', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('\nTenant ID: ' + TENANT_ID, 'blue');
  log('Application DB: ' + process.env.NEXT_PUBLIC_SUPABASE_URL, 'blue');
  log('Tenant Data DB: ' + process.env.DEFAULT_TENANT_DATA_URL, 'blue');
  console.log('');

  log('📊 Step 1: Comparing Data Counts', 'magenta');
  log('━'.repeat(60), 'cyan');

  const comparison = [];

  for (const tableName of BUSINESS_TABLES) {
    const appResult = await getTableCounts(appDb, tableName);
    const tenantResult = await getTableCounts(tenantDb, tableName);

    const diff = appResult.count - tenantResult.count;

    comparison.push({
      table: tableName,
      appCount: appResult.count,
      tenantCount: tenantResult.count,
      diff,
      hasNew: diff > 0
    });

    const status = diff > 0 ? '⚠️ ' : diff < 0 ? '❓' : '✓ ';
    const color = diff > 0 ? 'yellow' : diff < 0 ? 'magenta' : 'green';

    log(
      `${status} ${tableName.padEnd(25)} App: ${String(appResult.count).padStart(3)} | Tenant: ${String(tenantResult.count).padStart(3)} | Diff: ${diff > 0 ? '+' : ''}${diff}`,
      color
    );
  }

  // Find tables with new data
  const tablesWithNewData = comparison.filter(t => t.hasNew);

  console.log('');
  log('━'.repeat(60), 'cyan');
  log(`📈 Summary:`, 'cyan');
  log(`   Tables checked: ${BUSINESS_TABLES.length}`, 'blue');
  log(`   Tables with new data in app DB: ${tablesWithNewData.length}`, 'yellow');
  log(`   Total new records: ${tablesWithNewData.reduce((sum, t) => sum + t.diff, 0)}`, 'yellow');
  log('━'.repeat(60), 'cyan');

  if (tablesWithNewData.length === 0) {
    log('\n✅ No new data found in application DB!', 'green');
    log('All data is already in tenant DB.', 'green');
    return { tablesWithNewData: [], totalNew: 0 };
  }

  log('\n⚠️  Found new data in application DB:', 'yellow');
  tablesWithNewData.forEach(t => {
    log(`   • ${t.table}: ${t.diff} new record(s)`, 'yellow');
  });

  const answer = await askQuestion('\n❓ Do you want to migrate this new data to tenant DB? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    log('\n⏭️  Skipping migration.', 'yellow');
    return { tablesWithNewData, totalNew: tablesWithNewData.reduce((sum, t) => sum + t.diff, 0) };
  }

  log('\n📊 Step 2: Migrating New Data', 'magenta');
  log('━'.repeat(60), 'cyan');

  let migratedTotal = 0;
  const errors = [];

  for (const tableInfo of tablesWithNewData) {
    log(`\nMigrating ${tableInfo.table}... (${tableInfo.diff} new records)`, 'blue');

    // Get all data from app DB
    const { data: appData } = await getTableData(appDb, tableInfo.table);
    const { data: tenantData } = await getTableData(tenantDb, tableInfo.table);

    // Find records in app DB but not in tenant DB
    const tenantIds = new Set(tenantData.map(r => r.id));
    const newRecords = appData.filter(r => !tenantIds.has(r.id));

    // Migrate
    const result = await migrateNewData(tableInfo.table, newRecords);

    if (result.success) {
      migratedTotal += result.count;
    } else {
      errors.push({ table: tableInfo.table, error: result.error });
    }
  }

  log('\n━'.repeat(60), 'cyan');
  log(`📈 Migration Summary:`, 'cyan');
  log(`   Total records migrated: ${migratedTotal}`, 'green');
  log(`   Errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green');
  log('━'.repeat(60), 'cyan');

  if (errors.length > 0) {
    log('\n❌ Errors:', 'red');
    errors.forEach(({ table, error }) => {
      log(`   ${table}: ${error}`, 'red');
    });
  }

  return { tablesWithNewData, totalNew: migratedTotal, errors };
}

async function confirmCleanup() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🧹 Step 3: Cleanup Application Database (Optional)', 'magenta');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n⚠️  WARNING: This will DELETE all business data from application DB!', 'yellow');
  log('This includes ALL records in these tables:', 'yellow');
  log('   • accounts, contacts, leads, opportunities', 'yellow');
  log('   • events, invoices, quotes, contracts', 'yellow');
  log('   • tasks, notes, attachments, communications', 'yellow');
  log('   • And 10+ more business data tables', 'yellow');

  log('\n✅ SAFE: This will NOT delete:', 'green');
  log('   • tenants (application metadata)', 'green');
  log('   • users (authentication)', 'green');
  log('   • audit_log (system logs)', 'green');

  log('\n💡 Why clean up?', 'cyan');
  log('   • Avoid confusion (data in 2 places)', 'cyan');
  log('   • Properly use dual-database architecture', 'cyan');
  log('   • All business data should be in tenant DB only', 'cyan');

  const answer = await askQuestion('\n❓ Do you want to DELETE business data from application DB? (yes/no): ');

  return answer.toLowerCase() === 'yes';
}

async function cleanupApplicationDb() {
  log('\n📊 Cleaning up application database...', 'blue');
  log('━'.repeat(60), 'cyan');

  let deletedTotal = 0;
  const errors = [];

  for (const tableName of BUSINESS_TABLES) {
    try {
      log(`\nDeleting ${tableName}...`, 'blue');

      const { data, error, count } = await appDb
        .from(tableName)
        .delete()
        .eq('tenant_id', TENANT_ID)
        .select('id', { count: 'exact' });

      if (error) {
        log(`  ✗ Error: ${error.message}`, 'red');
        errors.push({ table: tableName, error: error.message });
      } else {
        const deletedCount = data?.length || 0;
        deletedTotal += deletedCount;
        log(`  ✓ Deleted ${deletedCount} records`, 'green');
      }
    } catch (error) {
      log(`  ✗ Exception: ${error.message}`, 'red');
      errors.push({ table: tableName, error: error.message });
    }
  }

  log('\n━'.repeat(60), 'cyan');
  log(`📈 Cleanup Summary:`, 'cyan');
  log(`   Total records deleted: ${deletedTotal}`, 'green');
  log(`   Errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green');
  log('━'.repeat(60), 'cyan');

  if (errors.length > 0) {
    log('\n❌ Errors:', 'red');
    errors.forEach(({ table, error }) => {
      log(`   ${table}: ${error}`, 'red');
    });
  }

  return { deletedTotal, errors };
}

async function main() {
  try {
    // Step 1 & 2: Compare and sync
    const syncResult = await compareAndSync();

    if (syncResult.totalNew > 0 || syncResult.tablesWithNewData.length > 0) {
      log('\n✅ New data has been migrated to tenant DB!', 'green');
    }

    // Step 3: Cleanup (optional)
    const shouldCleanup = await confirmCleanup();

    if (shouldCleanup) {
      const cleanupResult = await cleanupApplicationDb();

      log('\n✅ Application database cleanup complete!', 'green');
      log(`\n📊 Final Summary:`, 'cyan');
      log(`   Records migrated: ${syncResult.totalNew || 0}`, 'green');
      log(`   Records deleted from app DB: ${cleanupResult.deletedTotal}`, 'green');
    } else {
      log('\n⏭️  Skipped cleanup. Business data remains in both databases.', 'yellow');
      log('\n💡 Recommendation: Run this script again later to clean up.', 'cyan');
    }

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('🎉 Done!', 'green');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  } catch (error) {
    log('\n❌ Unexpected error:', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
