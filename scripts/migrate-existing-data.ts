#!/usr/bin/env ts-node

/**
 * Data Migration Script
 *
 * This script migrates existing tenant data from the application database
 * to the new tenant data database.
 *
 * Usage: npx ts-node scripts/migrate-existing-data.ts --tenant-id=<uuid>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Tables to migrate (in order, respecting foreign keys)
const TABLES_TO_MIGRATE = [
  // Core CRM
  'accounts',
  'contacts',
  'contact_accounts',
  'leads',
  'opportunities',
  'opportunity_line_items',

  // Locations
  'locations',

  // Events
  'events',
  'event_dates',
  'event_categories',
  'event_types',
  'event_staff_assignments',
  'event_design_items',
  'event_custom_items',

  // Financial
  'invoices',
  'invoice_line_items',
  'payments',
  'payment_status_options',
  'quotes',
  'quote_line_items',
  'products',
  'packages',
  'add_ons',

  // Equipment
  'equipment_types',
  'equipment_items',
  'booth_types',
  'booths',
  'booth_assignments',

  // Operations
  'tasks',
  'core_task_templates',
  'event_core_task_completion',
  'contracts',
  'templates',
  'attachments',
  'communications',
  'notes',

  // Design
  'design_statuses',
  'design_item_types',

  // Staff
  'staff_roles',
  'user_pay_rate_history',
  'user_role_history',

  // Settings
  'tenant_settings',
  'user_integrations',
];

interface MigrationStats {
  table: string;
  sourceCount: number;
  migratedCount: number;
  errors: number;
  duration: number;
}

async function getTenantIdFromArgs(): Promise<string> {
  const args = process.argv.slice(2);
  const tenantIdArg = args.find((arg) => arg.startsWith('--tenant-id='));

  if (!tenantIdArg) {
    throw new Error(
      'Tenant ID is required. Usage: npm run migrate:data -- --tenant-id=<uuid>'
    );
  }

  return tenantIdArg.split('=')[1];
}

async function migrateTable(
  sourceDb: any,
  targetDb: any,
  tableName: string,
  tenantId: string
): Promise<MigrationStats> {
  const start = Date.now();
  const stats: MigrationStats = {
    table: tableName,
    sourceCount: 0,
    migratedCount: 0,
    errors: 0,
    duration: 0,
  };

  try {
    // Check if table exists in source
    const { data: sourceData, error: sourceError } = await sourceDb
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (sourceError) {
      // Table might not exist in source, which is ok
      if (sourceError.code === '42P01') {
        log(`  ⊘ ${tableName} - Table doesn't exist in source (skipping)`, 'yellow');
        return stats;
      }
      throw sourceError;
    }

    stats.sourceCount = sourceData?.length || 0;

    if (stats.sourceCount === 0) {
      log(`  ⊘ ${tableName} - No data to migrate`, 'yellow');
      return stats;
    }

    // Check if data already exists in target
    const { data: existingData } = await targetDb
      .from(tableName)
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (existingData && existingData.length > 0) {
      log(`  ⚠ ${tableName} - Data already exists in target (skipping)`, 'yellow');
      return stats;
    }

    // Migrate data in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < sourceData.length; i += BATCH_SIZE) {
      const batch = sourceData.slice(i, i + BATCH_SIZE);

      const { error: insertError } = await targetDb.from(tableName).insert(batch);

      if (insertError) {
        log(`  ✗ ${tableName} - Error migrating batch ${i / BATCH_SIZE + 1}`, 'red');
        console.error(insertError);
        stats.errors += batch.length;
      } else {
        stats.migratedCount += batch.length;
      }
    }

    stats.duration = Date.now() - start;

    if (stats.errors === 0) {
      log(
        `  ✓ ${tableName} - Migrated ${stats.migratedCount} records (${stats.duration}ms)`,
        'green'
      );
    } else {
      log(
        `  ⚠ ${tableName} - Migrated ${stats.migratedCount}/${stats.sourceCount} records with ${stats.errors} errors`,
        'yellow'
      );
    }
  } catch (error) {
    stats.duration = Date.now() - start;
    log(`  ✗ ${tableName} - Migration failed`, 'red');
    console.error(error);
  }

  return stats;
}

async function main() {
  console.clear();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📦 Tenant Data Migration', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');

  // Get tenant ID
  const tenantId = await getTenantIdFromArgs();
  log(`Tenant ID: ${tenantId}`, 'blue');
  console.log('');

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not found in environment');
  }
  if (!process.env.DEFAULT_TENANT_DATA_URL) {
    throw new Error('DEFAULT_TENANT_DATA_URL not found in environment');
  }

  // Create database clients
  const sourceDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const targetDb = createClient(
    process.env.DEFAULT_TENANT_DATA_URL,
    process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!
  );

  log('📡 Testing connections...', 'blue');

  // Test source connection
  const { error: sourceError } = await sourceDb.from('tenants').select('id').limit(1);
  if (sourceError) {
    throw new Error(`Failed to connect to source database: ${sourceError.message}`);
  }
  log('  ✓ Source database connected', 'green');

  // Test target connection
  const { error: targetError } = await targetDb.from('accounts').select('id').limit(1);
  if (targetError && targetError.code !== 'PGRST116') {
    throw new Error(`Failed to connect to target database: ${targetError.message}`);
  }
  log('  ✓ Target database connected', 'green');
  console.log('');

  // Verify tenant exists
  const { data: tenant, error: tenantError } = await sourceDb
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single();

  if (tenantError) {
    throw new Error(`Tenant not found: ${tenantError.message}`);
  }

  log(`🏢 Migrating data for tenant: ${tenant.name}`, 'blue');
  console.log('');

  // Confirm migration
  log('⚠️  WARNING: This will copy data from the application database to the tenant data database.', 'yellow');
  log('⚠️  Existing data in the target database will be preserved (no overwrite).', 'yellow');
  console.log('');

  // For automation, we skip the confirmation
  // In production, you might want to add a --confirm flag
  log('Starting migration...', 'blue');
  console.log('');

  // Migrate tables
  const allStats: MigrationStats[] = [];

  for (const tableName of TABLES_TO_MIGRATE) {
    const stats = await migrateTable(sourceDb, targetDb, tableName, tenantId);
    allStats.push(stats);
  }

  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📊 Migration Summary', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');

  const totalSource = allStats.reduce((sum, s) => sum + s.sourceCount, 0);
  const totalMigrated = allStats.reduce((sum, s) => sum + s.migratedCount, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0);
  const totalDuration = allStats.reduce((sum, s) => sum + s.duration, 0);
  const tablesProcessed = allStats.filter((s) => s.sourceCount > 0).length;

  log(`Tables Processed: ${tablesProcessed}/${TABLES_TO_MIGRATE.length}`, 'blue');
  log(`Total Records in Source: ${totalSource}`, 'blue');
  log(`Total Records Migrated: ${totalMigrated}`, totalMigrated > 0 ? 'green' : 'yellow');
  log(`Total Errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
  log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`, 'blue');
  console.log('');

  if (totalErrors === 0 && totalMigrated > 0) {
    log('🎉 Migration completed successfully!', 'green');
    console.log('');
    log('Next steps:', 'blue');
    console.log('  1. Verify data in the target database');
    console.log('  2. Update tenant record with connection info');
    console.log('  3. Test your application');
    console.log('');
  } else if (totalErrors > 0) {
    log('⚠️  Migration completed with errors. Please review the logs above.', 'yellow');
    console.log('');
    process.exit(1);
  } else {
    log('ℹ️  No data found to migrate.', 'blue');
    console.log('');
  }
}

main().catch((error) => {
  console.error('');
  log('❌ Migration failed:', 'red');
  console.error(error);
  console.error('');
  process.exit(1);
});
