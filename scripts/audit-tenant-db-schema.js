#!/usr/bin/env node

/**
 * Audit Tenant Database Schema
 *
 * Compares tables between Application DB and Tenant DB to find missing tables.
 *
 * Expected architecture:
 * - Application DB: tenants, users (global), application metadata
 * - Tenant DB: ALL business data (contacts, accounts, leads, opportunities, events, settings, etc.)
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
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Tables that should be in TENANT DB (business data + tenant-specific config)
const TENANT_TABLES = [
  // Core Business Entities
  'accounts',
  'contacts',
  'contact_accounts',
  'leads',
  'opportunities',
  'opportunity_line_items',
  'events',
  'event_dates',
  'event_staff',
  'invoices',
  'invoice_line_items',
  'quotes',
  'quote_line_items',
  'payments',

  // Supporting Data
  'locations',
  'tasks',
  'notes',
  'attachments',
  'communications',
  'contracts',

  // Configuration & Settings
  'tenant_settings',
  'templates',
  'packages',
  'add_ons',
  'staff_roles',

  // Event-Specific
  'event_categories',
  'event_types',
  'booth_types',
  'booths',
  'booth_assignments',
  'equipment',
  'equipment_types',
  'equipment_items',
  'equipment_categories',
  'design_types',
  'design_statuses',

  // Core Tasks System
  'core_task_templates',
  'core_tasks',
];

// Tables that should be in APPLICATION DB ONLY
const APPLICATION_TABLES = [
  'tenants',
  'users', // Global users table (NOT tenant-specific)
  'roles',
  'permissions',
  'audit_log',
];

async function getTables(db, dbName) {
  const { data, error } = await db.rpc('get_tables_list');

  if (error) {
    // Fallback: Query information_schema
    const { data: tables, error: err2 } = await db
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (err2) {
      log(`Error getting tables from ${dbName}: ${err2.message}`, 'red');
      return null;
    }

    return tables.map(t => t.table_name);
  }

  return data;
}

async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('TENANT DATABASE SCHEMA AUDIT', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  // Get tables from both databases
  log('Fetching table lists...', 'cyan');

  const appTables = await getTables(appDb, 'Application DB');
  const tenantTables = await getTables(tenantDb, 'Tenant DB');

  if (!appTables || !tenantTables) {
    log('\nFailed to fetch table lists. Trying alternative method...', 'yellow');

    // Alternative: Query using raw SQL
    const { data: appData } = await appDb.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    });

    const { data: tenantData } = await tenantDb.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    });

    if (!appData || !tenantData) {
      log('Unable to fetch tables. Manual check required.', 'red');
      return;
    }
  }

  log(`\nApplication DB: ${appTables ? appTables.length : 0} tables`, 'cyan');
  log(`Tenant DB: ${tenantTables ? tenantTables.length : 0} tables\n`, 'cyan');

  // Find missing tenant tables
  const missingInTenant = TENANT_TABLES.filter(t =>
    !tenantTables || !tenantTables.includes(t)
  );

  // Find tables that should NOT be in tenant DB
  const wronglyInTenant = APPLICATION_TABLES.filter(t =>
    tenantTables && tenantTables.includes(t)
  );

  // Report
  log('='.repeat(80), 'blue');
  log('MISSING TABLES IN TENANT DB', 'bold');
  log('='.repeat(80), 'blue');

  if (missingInTenant.length === 0) {
    log('✅ All expected tenant tables are present!', 'green');
  } else {
    log(`❌ Found ${missingInTenant.length} missing tables:\n`, 'red');
    missingInTenant.forEach(table => {
      const inApp = appTables && appTables.includes(table);
      if (inApp) {
        log(`  ⚠️  ${table} (EXISTS in App DB - needs migration)`, 'yellow');
      } else {
        log(`  ❌ ${table} (MISSING from both DBs - needs creation)`, 'red');
      }
    });
  }

  log('\n' + '='.repeat(80), 'blue');
  log('TABLES IN WRONG DATABASE', 'bold');
  log('='.repeat(80), 'blue');

  if (wronglyInTenant.length === 0) {
    log('✅ No application tables found in tenant DB', 'green');
  } else {
    log(`⚠️  Found ${wronglyInTenant.length} application tables in tenant DB:\n`, 'yellow');
    wronglyInTenant.forEach(table => {
      log(`  - ${table}`, 'yellow');
    });
  }

  // Critical tables check
  const criticalMissing = ['tenant_settings', 'accounts', 'contacts', 'opportunities', 'events'].filter(t =>
    missingInTenant.includes(t)
  );

  if (criticalMissing.length > 0) {
    log('\n' + '='.repeat(80), 'red');
    log('🚨 CRITICAL TABLES MISSING 🚨', 'bold');
    log('='.repeat(80), 'red');
    log('\nThe following critical tables are missing from Tenant DB:', 'red');
    criticalMissing.forEach(table => {
      log(`  ❌ ${table}`, 'red');
    });
    log('\nThis explains the 500 errors and missing data!', 'yellow');
  }

  // Next steps
  log('\n' + '='.repeat(80), 'blue');
  log('RECOMMENDED NEXT STEPS', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  if (missingInTenant.length > 0) {
    log('1. Create missing tables in Tenant DB', 'yellow');
    log('2. Migrate data from Application DB to Tenant DB', 'yellow');
    log('3. Update API routes to use correct database', 'yellow');
    log('\nRun: node scripts/migrate-missing-tables.js', 'green');
  } else {
    log('Schema looks good! ✅', 'green');
  }

  log('\n');
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
