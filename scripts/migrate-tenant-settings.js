#!/usr/bin/env node

/**
 * Migrate tenant_settings Table to Tenant Database
 *
 * This script:
 * 1. Creates tenant_settings table in Tenant DB (copies schema from App DB)
 * 2. Migrates all settings data for your tenant
 * 3. Verifies the migration worked
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

async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('TENANT_SETTINGS MIGRATION', 'bold');
  log('='.repeat(80) + '\n', 'blue');

  // Step 1: Check current state
  log('Step 1: Checking current state...', 'cyan');

  const { data: appSettings, error: appError } = await appDb
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (appError) {
    log(`❌ Error reading from Application DB: ${appError.message}`, 'red');
    process.exit(1);
  }

  log(`✅ Found ${appSettings.length} settings in Application DB`, 'green');

  // Check if table exists in Tenant DB
  const { data: tenantCheck } = await tenantDb
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', 'tenant_settings')
    .single();

  const tableExists = !!tenantCheck;

  if (tableExists) {
    log('⚠️  tenant_settings table already exists in Tenant DB', 'yellow');

    const { count } = await tenantDb
      .from('tenant_settings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID);

    log(`   Current row count: ${count}`, 'yellow');

    const answer = await askQuestion('\nDo you want to DELETE existing data and re-migrate? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      log('❌ Migration cancelled', 'yellow');
      process.exit(0);
    }

    // Delete existing data
    log('\nDeleting existing data...', 'yellow');
    await tenantDb
      .from('tenant_settings')
      .delete()
      .eq('tenant_id', TENANT_ID);
    log('✅ Deleted existing data', 'green');
  }

  // Step 2: Create table (if needed)
  if (!tableExists) {
    log('\nStep 2: Creating tenant_settings table in Tenant DB...', 'cyan');
    log('   (Run this SQL manually in Tenant DB):\n', 'yellow');

    const createTableSQL = `
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, setting_key)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON tenant_settings(tenant_id, setting_key);

-- Enable RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenants can only access their own settings
CREATE POLICY tenant_settings_tenant_isolation ON tenant_settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
`;

    log(createTableSQL, 'cyan');
    log('\n⚠️  Please run the above SQL in your Tenant DB, then press Enter to continue...', 'yellow');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise(resolve => readline.question('', resolve));
    readline.close();
  }

  // Step 3: Migrate data
  log('\nStep 3: Migrating settings data...', 'cyan');

  if (appSettings.length === 0) {
    log('⚠️  No settings to migrate', 'yellow');
    return;
  }

  // Prepare data for insertion
  const settingsToInsert = appSettings.map(s => ({
    id: s.id,
    tenant_id: s.tenant_id,
    setting_key: s.setting_key,
    setting_value: s.setting_value,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  log(`   Migrating ${settingsToInsert.length} settings...`, 'cyan');

  const { data: inserted, error: insertError } = await tenantDb
    .from('tenant_settings')
    .insert(settingsToInsert)
    .select();

  if (insertError) {
    log(`❌ Error inserting data: ${insertError.message}`, 'red');
    log(`   Code: ${insertError.code}`, 'red');
    log(`   Details: ${insertError.details}`, 'red');
    process.exit(1);
  }

  log(`✅ Successfully migrated ${inserted.length} settings`, 'green');

  // Step 4: Verify opportunity stages
  log('\nStep 4: Verifying opportunity stages...', 'cyan');

  const { data: stages, error: stagesError } = await tenantDb
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', TENANT_ID)
    .like('setting_key', 'opportunities.stages%');

  if (stagesError) {
    log(`⚠️  Could not verify stages: ${stagesError.message}`, 'yellow');
  } else if (stages.length === 0) {
    log('⚠️  No opportunity stage settings found', 'yellow');
  } else {
    log(`✅ Found ${stages.length} opportunity stage settings`, 'green');

    // Try to parse and show stages
    const stagesArray = stages.find(s => s.setting_key === 'opportunities.stages');
    if (stagesArray && Array.isArray(stagesArray.setting_value)) {
      log(`\n   Your opportunity stages:`, 'cyan');
      stagesArray.setting_value.forEach((stage, i) => {
        log(`      ${i + 1}. ${stage.name} (${stage.id}) - ${stage.probability}%`, 'green');
      });

      // Check for the custom stage
      const hasCustomStage = stagesArray.setting_value.some(s => s.id === 'stage_1761253720446');
      if (hasCustomStage) {
        log(`\n   ✅ Found your custom stage: stage_1761253720446`, 'green');
      } else {
        log(`\n   ⚠️  Custom stage stage_1761253720446 NOT found`, 'yellow');
      }
    }
  }

  // Step 5: Success message
  log('\n' + '='.repeat(80), 'green');
  log('✅ MIGRATION COMPLETE!', 'bold');
  log('='.repeat(80), 'green');

  log('\nNext steps:', 'cyan');
  log('1. Test the settings API: curl http://localhost:3000/api/settings', 'cyan');
  log('2. Go to Settings > Opportunities in your app', 'cyan');
  log('3. Verify your custom stages are visible', 'cyan');
  log('4. Check if the 3 opportunities now appear in pipeline view', 'cyan');
  log('\n');
}

function askQuestion(query) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => readline.question(query, ans => {
    readline.close();
    resolve(ans);
  }));
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
