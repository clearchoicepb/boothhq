#!/usr/bin/env node

/**
 * Count ALL Tables in Both Databases
 *
 * Simple count to verify we're finding all tables
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

async function getAllTables(db, dbName) {
  // Use direct SQL query to get ALL tables
  const { data, error } = await db.rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (error) {
    // Fallback: try without rpc
    const { data: tables, error: err2 } = await db
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (err2) {
      log(`❌ Error getting tables from ${dbName}:`, 'red');
      log(`   ${err2.message}`, 'red');
      return null;
    }
    return tables.map(t => t.table_name);
  }

  return data;
}

async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('TABLE COUNT VERIFICATION', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  log('Fetching ALL tables from both databases...', 'cyan');

  const appTables = await getAllTables(appDb, 'Application DB');
  const tenantTables = await getAllTables(tenantDb, 'Tenant DB');

  if (!appTables || !tenantTables) {
    log('\n❌ Failed to fetch table lists', 'red');
    return;
  }

  log('\n' + '='.repeat(80), 'blue');
  log('TABLE COUNTS', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  log(`Application DB: ${appTables.length} tables`, 'cyan');
  log(`Tenant DB: ${tenantTables.length} tables\n`, 'cyan');

  log('Expected (from Supabase UI):', 'yellow');
  log('  Application DB: 46 tables', 'yellow');
  log('  Tenant DB: 13 tables\n', 'yellow');

  const appDiff = 46 - appTables.length;
  const tenantDiff = 13 - tenantTables.length;

  if (appDiff === 0 && tenantDiff === 0) {
    log('✅ Found ALL tables!', 'green');
  } else {
    log(`⚠️  Missing ${appDiff} tables from Application DB`, appDiff > 0 ? 'yellow' : 'green');
    log(`⚠️  Missing ${tenantDiff} tables from Tenant DB\n`, tenantDiff > 0 ? 'yellow' : 'green');
  }

  // Check for tenant_settings specifically
  log('='.repeat(80), 'blue');
  log('TENANT_SETTINGS CHECK', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  const inApp = appTables.includes('tenant_settings');
  const inTenant = tenantTables.includes('tenant_settings');

  log(`Application DB: ${inApp ? '✅ tenant_settings EXISTS' : '❌ tenant_settings MISSING'}`, inApp ? 'green' : 'red');
  log(`Tenant DB: ${inTenant ? '✅ tenant_settings EXISTS' : '❌ tenant_settings MISSING'}`, inTenant ? 'green' : 'red');

  // List ALL tables
  log('\n' + '='.repeat(80), 'blue');
  log('ALL APPLICATION DB TABLES', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  appTables.forEach((table, i) => {
    const inTenant = tenantTables.includes(table);
    const marker = inTenant ? '✅' : '  ';
    log(`${marker} ${i + 1}. ${table}`, inTenant ? 'green' : 'reset');
  });

  log('\n' + '='.repeat(80), 'blue');
  log('ALL TENANT DB TABLES', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  tenantTables.forEach((table, i) => {
    log(`${i + 1}. ${table}`, 'cyan');
  });

  log('\n');
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
