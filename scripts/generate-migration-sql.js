#!/usr/bin/env node

/**
 * Generate SQL INSERT Statements for Config Tables
 * 
 * Reads data from App DB and generates SQL to run in Tenant DB
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsert(tableName, data) {
  if (!data || data.length === 0) return `-- No data to migrate for ${tableName}\n`;
  
  const columns = Object.keys(data[0]);
  let sql = `-- Migrate ${tableName} (${data.length} records)\n`;
  sql += `INSERT INTO ${tableName} (${columns.join(', ')})\n`;
  sql += `VALUES\n`;
  
  const values = data.map((row, idx) => {
    const vals = columns.map(col => escapeSQL(row[col])).join(', ');
    const comma = idx < data.length - 1 ? ',' : '';
    return `  (${vals})${comma}`;
  });
  
  sql += values.join('\n');
  sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
  
  return sql;
}

async function main() {
  console.log('\n🔧 Generating SQL migration statements...\n');

  let fullSQL = `-- ============================================================================
-- AUTO-GENERATED CONFIGURATION TABLES MIGRATION
-- ============================================================================
-- Run this SQL in your TENANT DB SQL Editor
-- Generated: ${new Date().toISOString()}
-- ============================================================================

`;

  // 1. Event Categories
  console.log('📦 Fetching event_categories...');
  const { data: categories } = await appDb.from('event_categories').select('*');
  if (categories) {
    console.log(`   Found ${categories.length} records`);
    fullSQL += generateInsert('event_categories', categories);
  }

  // 2. Event Types
  console.log('📦 Fetching event_types...');
  const { data: types } = await appDb.from('event_types').select('*');
  if (types) {
    console.log(`   Found ${types.length} records`);
    fullSQL += generateInsert('event_types', types);
  }

  // 3. Design Statuses
  console.log('📦 Fetching design_statuses...');
  const { data: statuses } = await appDb
    .from('design_statuses')
    .select('*')
    .eq('tenant_id', TENANT_ID);
  if (statuses) {
    console.log(`   Found ${statuses.length} records`);
    fullSQL += generateInsert('design_statuses', statuses);
  }

  // 4. Core Task Templates
  console.log('📦 Fetching core_task_templates...');
  const { data: tasks } = await appDb
    .from('core_task_templates')
    .select('*')
    .eq('tenant_id', TENANT_ID);
  if (tasks) {
    console.log(`   Found ${tasks.length} records`);
    fullSQL += generateInsert('core_task_templates', tasks);
  }

  // Add verification queries
  fullSQL += `-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check row counts
SELECT 'event_categories' as table_name, COUNT(*) as count FROM event_categories
UNION ALL
SELECT 'event_types', COUNT(*) FROM event_types
UNION ALL
SELECT 'design_statuses', COUNT(*) FROM design_statuses
UNION ALL
SELECT 'core_task_templates', COUNT(*) FROM core_task_templates;

-- Test joins
SELECT 
    e.id,
    e.title,
    ec.name as category,
    et.name as type
FROM events e
LEFT JOIN event_categories ec ON e.event_category_id = ec.id
LEFT JOIN event_types et ON e.event_type_id = et.id
WHERE e.tenant_id = '${TENANT_ID}'
LIMIT 5;
`;

  // Write to file
  const outputPath = path.join(__dirname, 'migrate-config-data.sql');
  fs.writeFileSync(outputPath, fullSQL);

  console.log('\n✅ SQL generated successfully!');
  console.log(`   File: ${outputPath}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Open the generated SQL file');
  console.log('   2. Copy and paste into Tenant DB SQL Editor');
  console.log('   3. Run the SQL');
  console.log('   4. Check verification queries at the end\n');
}

main().catch(err => {
  console.error('\n💥 Error:', err.message);
  process.exit(1);
});

