#!/usr/bin/env node

/**
 * Audit Dual Database Schema
 * 
 * Compares Application DB and Tenant DB to find:
 * 1. Tables with tenant_id that might need to be in Tenant DB
 * 2. Tables that exist in one DB but not the other
 * 3. Tables that should probably exist in both (like settings)
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
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function box(title) {
  const width = 80;
  log('\n' + '═'.repeat(width), 'blue');
  log(title, 'bold');
  log('═'.repeat(width), 'blue');
}

async function getTables(db, dbName) {
  const { data, error } = await db
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    log(`❌ Error getting tables from ${dbName}: ${error.message}`, 'red');
    return [];
  }

  return data.map(t => t.table_name).filter(t => 
    !t.startsWith('pg_') && 
    !t.startsWith('_') &&
    t !== 'schema_migrations' &&
    t !== 'supabase_migrations'
  );
}

async function getTableColumns(db, tableName) {
  const { data, error } = await db
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (error) {
    return [];
  }

  return data || [];
}

async function getTableRowCount(db, tableName) {
  try {
    const { count, error } = await db
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return null;
    }
    return count;
  } catch (err) {
    return null;
  }
}

async function main() {
  box('DUAL DATABASE SCHEMA AUDIT');

  // Get tables from both databases
  log('\n📊 Fetching table lists...', 'cyan');
  const [appTables, tenantTables] = await Promise.all([
    getTables(appDb, 'Application DB'),
    getTables(tenantDb, 'Tenant DB')
  ]);

  log(`\n   Application DB: ${appTables.length} tables`, 'green');
  log(`   Tenant DB: ${tenantTables.length} tables`, 'green');

  // Find tables with tenant_id in App DB
  box('TABLES WITH TENANT_ID IN APPLICATION DB');
  log('\nThese tables reference tenants and might need to exist in Tenant DB too:\n', 'cyan');

  const tablesWithTenantId = [];
  for (const table of appTables) {
    const columns = await getTableColumns(appDb, table);
    const hasTenantId = columns.some(c => c.column_name === 'tenant_id');
    
    if (hasTenantId) {
      const count = await getTableRowCount(appDb, table);
      const inTenantDb = tenantTables.includes(table);
      tablesWithTenantId.push({ table, count, inTenantDb });
      
      const status = inTenantDb ? '✅' : '❌';
      const statusColor = inTenantDb ? 'green' : 'red';
      const countStr = count !== null ? ` (${count} rows)` : '';
      
      log(`${status} ${table}${countStr}`, statusColor);
      if (!inTenantDb) {
        log(`   ⚠️  MISSING from Tenant DB - might need migration`, 'yellow');
      }
    }
  }

  // Tables only in App DB
  box('TABLES ONLY IN APPLICATION DB');
  log('\nThese exist in App DB but not in Tenant DB:\n', 'cyan');
  
  const onlyInApp = appTables.filter(t => !tenantTables.includes(t));
  const nonTenantTables = onlyInApp.filter(t => 
    !tablesWithTenantId.find(x => x.table === t)
  );
  
  if (nonTenantTables.length === 0) {
    log('   None (good - all App DB tables are accounted for)', 'green');
  } else {
    for (const table of nonTenantTables) {
      const count = await getTableRowCount(appDb, table);
      const countStr = count !== null ? ` (${count} rows)` : '';
      log(`   • ${table}${countStr}`, 'gray');
    }
    log(`\n   These are likely App-only tables (auth, tenants, etc.)`, 'cyan');
  }

  // Tables only in Tenant DB
  box('TABLES ONLY IN TENANT DB');
  log('\nThese exist in Tenant DB but not in App DB:\n', 'cyan');
  
  const onlyInTenant = tenantTables.filter(t => !appTables.includes(t));
  if (onlyInTenant.length === 0) {
    log('   None', 'gray');
  } else {
    for (const table of onlyInTenant) {
      const count = await getTableRowCount(tenantDb, table);
      const countStr = count !== null ? ` (${count} rows)` : '';
      log(`   • ${table}${countStr}`, 'gray');
    }
  }

  // Summary and recommendations
  box('SUMMARY & RECOMMENDATIONS');
  
  const missingFromTenant = tablesWithTenantId.filter(t => !t.inTenantDb);
  
  if (missingFromTenant.length === 0) {
    log('\n✅ All tables with tenant_id exist in both databases!', 'green');
    log('   Your dual database architecture looks consistent.', 'green');
  } else {
    log(`\n⚠️  Found ${missingFromTenant.length} table(s) with potential issues:\n`, 'yellow');
    
    for (const { table, count } of missingFromTenant) {
      log(`   📋 ${table}`, 'yellow');
      log(`      - Has tenant_id in App DB`, 'gray');
      log(`      - Missing from Tenant DB`, 'gray');
      log(`      - Contains ${count || '?'} rows`, 'gray');
      log(`      → Recommend: Review if this should be migrated to Tenant DB\n`, 'cyan');
    }
  }

  // Shared tables check
  box('SHARED TABLES (Exist in Both DBs)');
  log('\nThese tables exist in both databases:\n', 'cyan');
  
  const sharedTables = appTables.filter(t => tenantTables.includes(t));
  for (const table of sharedTables) {
    const [appCount, tenantCount] = await Promise.all([
      getTableRowCount(appDb, table),
      getTableRowCount(tenantDb, table)
    ]);
    
    const appStr = appCount !== null ? `${appCount}` : '?';
    const tenantStr = tenantCount !== null ? `${tenantCount}` : '?';
    
    log(`   • ${table}`, 'gray');
    log(`      App DB: ${appStr} rows | Tenant DB: ${tenantStr} rows`, 'gray');
  }

  // Action items
  box('NEXT STEPS');
  log('\n1. Review any tables flagged as missing from Tenant DB', 'cyan');
  log('2. For each flagged table, determine:', 'cyan');
  log('   - Should it exist in Tenant DB? (tenant-specific data)', 'gray');
  log('   - Or should it stay in App DB? (shared/global data)', 'gray');
  log('3. Create migration scripts for tables that need to move', 'cyan');
  log('4. Update your application code to query the correct database', 'cyan');
  log('\n');
}

main().catch(err => {
  log(`\n💥 Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

