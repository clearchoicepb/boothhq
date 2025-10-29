#!/usr/bin/env node

/**
 * Restore Opportunity Stages Configuration
 *
 * This script helps diagnose and restore lost opportunity stage settings
 * after the data migration.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

// Create client for tenant database
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n=== Opportunity Stages Diagnostic ===\n', 'blue');

  // Step 1: Check for opportunities in custom stage
  log('Step 1: Finding opportunities in stage_1761253720446...', 'yellow');
  const { data: opps, error: oppsError } = await tenantDb
    .from('opportunities')
    .select('id, name, stage, amount')
    .eq('tenant_id', TENANT_ID)
    .eq('stage', 'stage_1761253720446');

  if (oppsError) {
    log(`Error: ${oppsError.message}`, 'red');
  } else {
    log(`Found ${opps.length} opportunities in this stage:`, 'green');
    opps.forEach(opp => {
      console.log(`  - ${opp.name} (${opp.id}) - $${opp.amount || 0}`);
    });
  }

  // Step 2: Check current tenant_settings for opportunities
  log('\nStep 2: Checking tenant_settings for opportunity stages...', 'yellow');
  const { data: settings, error: settingsError } = await tenantDb
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', TENANT_ID)
    .like('setting_key', 'opportunities.stages%');

  if (settingsError) {
    log(`Error: ${settingsError.message}`, 'red');
  } else if (settings.length === 0) {
    log('No opportunity.stages settings found in database!', 'red');
    log('This explains why your custom stages are missing.', 'yellow');
  } else {
    log(`Found ${settings.length} stage settings:`, 'green');
    settings.forEach(s => {
      console.log(`  ${s.setting_key}: ${JSON.stringify(s.setting_value).substring(0, 100)}...`);
    });
  }

  // Step 3: Check if ALL opportunities settings are missing
  log('\nStep 3: Checking all opportunity settings...', 'yellow');
  const { data: allSettings, error: allError } = await tenantDb
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', TENANT_ID)
    .like('setting_key', 'opportunities%');

  if (allError) {
    log(`Error: ${allError.message}`, 'red');
  } else {
    log(`Found ${allSettings.length} total opportunity settings`, 'green');
    allSettings.forEach(s => {
      console.log(`  - ${s.setting_key}`);
    });
  }

  // Step 4: Suggest fix
  log('\n=== Recommended Fix ===\n', 'blue');

  if (opps && opps.length > 0) {
    log('You have opportunities stuck in a custom stage that no longer exists.', 'yellow');
    log('\nOption 1: Restore the missing stage to tenant_settings', 'green');
    log('Option 2: Move these opportunities to an existing stage', 'green');
  }

  if (!settings || settings.length === 0) {
    log('\nYour tenant_settings table is missing the opportunity stages configuration.', 'yellow');
    log('This likely happened during the data migration.', 'yellow');
    log('\nTo fix: Go to Settings > Opportunities and reconfigure your stages.', 'green');
    log('The custom stage will need to be recreated with the same name you had before.', 'green');
  }

  log('\n');
}

main().catch(console.error);
