#!/usr/bin/env node

/**
 * List All Tables in Application Database
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
  'email_templates'
];

async function checkTable(tableName) {
  try {
    const { data, error, count } = await appDb
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

async function listTables() {
  console.log('\n📊 APPLICATION DATABASE TABLES\n');
  console.log('=' .repeat(70));
  
  const existingTables = [];
  const missingTables = [];

  for (const tableName of POSSIBLE_TABLES) {
    const result = await checkTable(tableName);
    
    if (result.exists) {
      existingTables.push({ name: tableName, count: result.count });
    } else {
      missingTables.push(tableName);
    }
  }

  // Sort by name
  existingTables.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\n✅ EXISTING TABLES (${existingTables.length}):\n`);
  existingTables.forEach(table => {
    const countStr = table.count !== null ? `(${table.count} rows)` : '';
    console.log(`   ${table.name.padEnd(35)} ${countStr}`);
  });

  console.log('\n' + '=' .repeat(70));
  console.log(`\nTotal tables found: ${existingTables.length}`);
  console.log('=' .repeat(70) + '\n');
}

listTables().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});


