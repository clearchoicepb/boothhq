#!/usr/bin/env node

/**
 * Compare Application DB vs Tenant DB Tables
 * Shows which tables exist where and identifies potential issues
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

// Comprehensive list of possible tables
const POSSIBLE_TABLES = [
  // Core CRM
  'accounts',
  'contacts',
  'contact_accounts',
  'leads',
  'opportunities',
  'opportunity_stages',
  'opportunity_line_items',
  
  // Events
  'events',
  'event_dates',
  'event_categories',
  'event_design_items',
  'event_design_item_types',
  'event_staffing',
  
  // Locations
  'locations',
  
  // Tasks & Activities
  'tasks',
  'core_tasks',
  'core_task_templates',
  'core_task_completions',
  'notes',
  'attachments',
  'communications',
  
  // Users & Auth
  'users',
  'tenants',
  'tenant_users',
  'user_roles',
  
  // Contracts & Invoicing
  'contracts',
  'invoices',
  'invoice_line_items',
  'payments',
  
  // Settings
  'tenant_settings',  // ← Added!
  'design_statuses',
  'opportunity_status_settings',
  'event_types',
  'lead_sources',
  'industries',
  
  // Audit
  'audit_log',
  
  // Other
  'products',
  'services',
  'vendors',
  'email_templates',
  
  // Additional tables to check
  'quotes',
  'quote_line_items',
  'booths',
  'booth_inventory',
  'inventory',
  'inventory_items'
];

async function checkTable(db, tableName) {
  try {
    const { data, error, count } = await db
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0);

    if (error) {
      return { exists: false, error: error.message };
    }

    return { exists: true, count: count || 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function compareDatabases() {
  console.log('\n' + '═'.repeat(80));
  console.log('DATABASE COMPARISON: Application DB vs Tenant DB');
  console.log('═'.repeat(80) + '\n');

  const results = [];

  console.log('🔍 Checking tables in both databases...\n');

  for (const tableName of POSSIBLE_TABLES) {
    const [appResult, tenantResult] = await Promise.all([
      checkTable(appDb, tableName),
      checkTable(tenantDb, tableName)
    ]);

    results.push({
      table: tableName,
      inApp: appResult.exists,
      inTenant: tenantResult.exists,
      appCount: appResult.count,
      tenantCount: tenantResult.count
    });
  }

  // Categorize results
  const inBoth = results.filter(r => r.inApp && r.inTenant);
  const onlyInApp = results.filter(r => r.inApp && !r.inTenant);
  const onlyInTenant = results.filter(r => !r.inApp && r.inTenant);
  const inNeither = results.filter(r => !r.inApp && !r.inTenant);

  // Display: Tables in BOTH databases
  console.log('═'.repeat(80));
  console.log(`✅ TABLES IN BOTH DATABASES (${inBoth.length})`);
  console.log('═'.repeat(80));
  console.log('\nTable Name                          App DB Rows    Tenant DB Rows');
  console.log('-'.repeat(80));
  
  inBoth.forEach(r => {
    const appStr = String(r.appCount).padStart(10);
    const tenantStr = String(r.tenantCount).padStart(15);
    console.log(`${r.table.padEnd(35)} ${appStr}    ${tenantStr}`);
  });

  // Display: Tables ONLY in App DB
  console.log('\n' + '═'.repeat(80));
  console.log(`⚠️  TABLES ONLY IN APPLICATION DB (${onlyInApp.length})`);
  console.log('═'.repeat(80));
  
  if (onlyInApp.length === 0) {
    console.log('\n   None\n');
  } else {
    console.log('\nTable Name                          Rows       Notes');
    console.log('-'.repeat(80));
    onlyInApp.forEach(r => {
      const rowStr = String(r.appCount).padStart(10);
      const note = shouldBeInTenantDb(r.table) 
        ? '🚨 Should probably be in Tenant DB'
        : '✓ App-only table (OK)';
      console.log(`${r.table.padEnd(35)} ${rowStr}   ${note}`);
    });
  }

  // Display: Tables ONLY in Tenant DB
  console.log('\n' + '═'.repeat(80));
  console.log(`⚠️  TABLES ONLY IN TENANT DB (${onlyInTenant.length})`);
  console.log('═'.repeat(80));
  
  if (onlyInTenant.length === 0) {
    console.log('\n   None\n');
  } else {
    console.log('\nTable Name                          Rows       Notes');
    console.log('-'.repeat(80));
    onlyInTenant.forEach(r => {
      const rowStr = String(r.tenantCount).padStart(10);
      console.log(`${r.table.padEnd(35)} ${rowStr}   Tenant-specific`);
    });
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nTables in both databases:        ${inBoth.length}`);
  console.log(`Tables only in Application DB:   ${onlyInApp.length}`);
  console.log(`Tables only in Tenant DB:        ${onlyInTenant.length}`);
  console.log(`Tables not found in either:      ${inNeither.length}`);

  // Identify potential problems
  const problems = onlyInApp.filter(r => shouldBeInTenantDb(r.table));
  
  if (problems.length > 0) {
    console.log('\n' + '═'.repeat(80));
    console.log('🚨 POTENTIAL ISSUES');
    console.log('═'.repeat(80));
    console.log('\nThese tables exist in App DB but might need to be in Tenant DB:\n');
    
    problems.forEach(r => {
      console.log(`   • ${r.table} (${r.appCount} rows)`);
      console.log(`     Reason: ${whyShouldBeInTenantDb(r.table)}\n`);
    });
  } else {
    console.log('\n✅ No obvious issues found!');
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

// Helper function to determine if a table should be in Tenant DB
function shouldBeInTenantDb(tableName) {
  // Tables that should typically be in Tenant DB (tenant-specific data)
  const tenantDataTables = [
    'tenant_settings',
    'opportunity_status_settings',
    'design_statuses',
    'event_types',
    'lead_sources',
    'industries'
  ];
  
  return tenantDataTables.includes(tableName);
}

function whyShouldBeInTenantDb(tableName) {
  const reasons = {
    'tenant_settings': 'Contains tenant-specific configuration',
    'opportunity_status_settings': 'Tenant-customizable opportunity statuses',
    'design_statuses': 'Tenant-customizable design statuses',
    'event_types': 'Tenant-specific event type configurations',
    'lead_sources': 'Tenant-specific lead source configurations',
    'industries': 'Tenant-customizable industry lists'
  };
  
  return reasons[tableName] || 'Tenant-specific configuration';
}

compareDatabases().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});

