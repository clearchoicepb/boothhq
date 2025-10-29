#!/usr/bin/env node

/**
 * Audit Tenant Database Schema
 * 
 * Compares the tenant database schema with the application database
 * to identify any discrepancies, missing tables, or column mismatches.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Database connections
const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

// Tables that should exist in the tenant database
const EXPECTED_TABLES = [
  'accounts',
  'contacts',
  'contact_accounts',
  'leads',
  'opportunities',
  'opportunity_stages',
  'opportunity_line_items',
  'locations',
  'events',
  'event_dates',
  'event_categories',
  'tasks',
  'notes',
  'attachments',
  'communications'
];

async function getTableColumns(db, tableName) {
  try {
    const { data, error } = await db
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return { error: error.message, columns: [] };
    }

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    return { columns, error: null };
  } catch (err) {
    return { error: err.message, columns: [] };
  }
}

async function getTableInfo(db, tableName) {
  // Get table columns using PostgreSQL information_schema
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  try {
    const { data, error } = await db.rpc('exec_sql', { sql: query });
    
    if (error) {
      // Fallback to simple column detection
      return await getTableColumns(db, tableName);
    }

    return { columns: data || [], error: null };
  } catch (err) {
    // Fallback to simple column detection
    return await getTableColumns(db, tableName);
  }
}

async function checkRLSPolicies(db, tableName) {
  const query = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = '${tableName}';
  `;

  try {
    const { data, error } = await db.rpc('exec_sql', { sql: query });
    
    if (error) {
      return { policies: [], error: error.message };
    }

    return { policies: data || [], error: null };
  } catch (err) {
    return { policies: [], error: err.message };
  }
}

async function auditSchema() {
  console.log('\n🔍 TENANT DATABASE SCHEMA AUDIT\n');
  console.log('=' .repeat(70));
  
  const issues = [];
  const summary = {
    totalTables: EXPECTED_TABLES.length,
    tablesChecked: 0,
    missingTables: [],
    columnMismatches: [],
    missingPolicies: [],
    errors: []
  };

  // Check each expected table
  for (const tableName of EXPECTED_TABLES) {
    console.log(`\n📋 Checking table: ${tableName}`);
    console.log('-'.repeat(70));

    // Check if table exists in app database
    const appResult = await getTableColumns(appDb, tableName);
    if (appResult.error) {
      console.log(`  ❌ App DB Error: ${appResult.error}`);
      summary.errors.push({ table: tableName, db: 'app', error: appResult.error });
      continue;
    }

    // Check if table exists in tenant database
    const tenantResult = await getTableColumns(tenantDb, tableName);
    if (tenantResult.error) {
      console.log(`  ❌ Tenant DB Error: ${tenantResult.error}`);
      if (tenantResult.error.includes('does not exist')) {
        summary.missingTables.push(tableName);
        console.log(`  ⚠️  Table missing in tenant database!`);
      } else {
        summary.errors.push({ table: tableName, db: 'tenant', error: tenantResult.error });
      }
      continue;
    }

    summary.tablesChecked++;

    // Compare columns
    const appColumns = appResult.columns.sort();
    const tenantColumns = tenantResult.columns.sort();

    const missingInTenant = appColumns.filter(col => !tenantColumns.includes(col));
    const extraInTenant = tenantColumns.filter(col => !appColumns.includes(col));

    if (missingInTenant.length > 0 || extraInTenant.length > 0) {
      console.log(`  ⚠️  Column mismatch detected!`);
      
      if (missingInTenant.length > 0) {
        console.log(`  ❌ Missing in tenant DB: ${missingInTenant.join(', ')}`);
        summary.columnMismatches.push({
          table: tableName,
          type: 'missing',
          columns: missingInTenant
        });
      }

      if (extraInTenant.length > 0) {
        console.log(`  ➕ Extra in tenant DB: ${extraInTenant.join(', ')}`);
        summary.columnMismatches.push({
          table: tableName,
          type: 'extra',
          columns: extraInTenant
        });
      }
    } else {
      console.log(`  ✅ Columns match (${appColumns.length} columns)`);
    }

    // Check RLS policies (informational)
    const { policies, error: rlsError } = await checkRLSPolicies(tenantDb, tableName);
    if (rlsError) {
      console.log(`  ℹ️  RLS check skipped: ${rlsError}`);
    } else if (policies.length === 0) {
      console.log(`  ⚠️  No RLS policies found (may need service role policies)`);
      summary.missingPolicies.push(tableName);
    } else {
      console.log(`  ✅ RLS policies: ${policies.length} found`);
    }
  }

  // Print summary
  console.log('\n');
  console.log('=' .repeat(70));
  console.log('📊 AUDIT SUMMARY');
  console.log('=' .repeat(70));
  console.log(`\nTotal tables expected: ${summary.totalTables}`);
  console.log(`Tables successfully checked: ${summary.tablesChecked}`);
  
  if (summary.missingTables.length > 0) {
    console.log(`\n❌ Missing tables (${summary.missingTables.length}):`);
    summary.missingTables.forEach(table => console.log(`   - ${table}`));
  }

  if (summary.columnMismatches.length > 0) {
    console.log(`\n⚠️  Column mismatches (${summary.columnMismatches.length}):`);
    summary.columnMismatches.forEach(mismatch => {
      console.log(`   - ${mismatch.table}: ${mismatch.type} columns: ${mismatch.columns.join(', ')}`);
    });
  }

  if (summary.errors.length > 0) {
    console.log(`\n❌ Errors encountered (${summary.errors.length}):`);
    summary.errors.forEach(err => {
      console.log(`   - ${err.table} (${err.db}): ${err.error}`);
    });
  }

  if (summary.missingPolicies.length > 0) {
    console.log(`\n⚠️  Tables without RLS policies (${summary.missingPolicies.length}):`);
    console.log(`   Note: Service role should bypass RLS automatically`);
    summary.missingPolicies.forEach(table => console.log(`   - ${table}`));
  }

  // Overall status
  console.log('\n');
  console.log('=' .repeat(70));
  const allGood = summary.missingTables.length === 0 && 
                  summary.columnMismatches.length === 0 && 
                  summary.errors.length === 0;

  if (allGood) {
    console.log('✅ AUDIT PASSED: Tenant database schema is in sync!');
  } else {
    console.log('❌ AUDIT FAILED: Schema discrepancies found!');
    console.log('\nRecommended actions:');
    if (summary.missingTables.length > 0) {
      console.log('  1. Run the tenant database schema SQL to create missing tables');
    }
    if (summary.columnMismatches.length > 0) {
      console.log('  2. Update tenant database schema to match application database');
    }
    if (summary.errors.length > 0) {
      console.log('  3. Check database connections and permissions');
    }
  }
  console.log('=' .repeat(70));
  console.log('\n');

  process.exit(allGood ? 0 : 1);
}

// Run the audit
auditSchema().catch(error => {
  console.error('\n❌ Fatal error during audit:', error);
  process.exit(1);
});
