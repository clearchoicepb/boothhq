#!/usr/bin/env node

/**
 * Diagnose Tenant Configuration
 *
 * Checks if tenant record has the encrypted connection strings
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

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🔍 Tenant Configuration Diagnostic', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  log(`Tenant ID: ${TENANT_ID}`, 'cyan');
  log(`Application DB: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`, 'cyan');

  // Fetch tenant record
  const { data: tenant, error } = await appDb
    .from('tenants')
    .select('*')
    .eq('id', TENANT_ID)
    .single();

  if (error) {
    log(`❌ Error fetching tenant: ${error.message}`, 'red');
    process.exit(1);
  }

  log('📊 Tenant Record Analysis\n', 'cyan');
  log('━'.repeat(60), 'cyan');

  // Check each field
  const checks = [
    {
      field: 'data_source_url',
      value: tenant.data_source_url,
      expected: 'https://swytdziswfndllwosbsd.supabase.co',
      critical: true
    },
    {
      field: 'data_source_anon_key',
      value: tenant.data_source_anon_key,
      expected: '[ENCRYPTED STRING]',
      critical: true
    },
    {
      field: 'data_source_service_key',
      value: tenant.data_source_service_key,
      expected: '[ENCRYPTED STRING]',
      critical: true
    },
    {
      field: 'data_source_region',
      value: tenant.data_source_region,
      expected: 'us-east-1 or Americas',
      critical: false
    },
    {
      field: 'tenant_id_in_data_source',
      value: tenant.tenant_id_in_data_source,
      expected: TENANT_ID,
      critical: true
    },
    {
      field: 'connection_pool_config',
      value: tenant.connection_pool_config,
      expected: '{"min": 2, "max": 10}',
      critical: false
    }
  ];

  let allGood = true;

  checks.forEach(check => {
    const hasValue = check.value !== null && check.value !== undefined && check.value !== '';
    const status = hasValue ? '✅' : '❌';
    const color = hasValue ? 'green' : 'red';

    if (!hasValue && check.critical) {
      allGood = false;
    }

    log(`${status} ${check.field}`, color);

    if (hasValue) {
      if (check.field.includes('key') && check.value) {
        // Show format for encrypted keys
        const format = check.value.includes(':') ? 'base64 (correct)' : 'unknown format';
        log(`   Value: [ENCRYPTED - ${format}]`, 'cyan');
        log(`   Length: ${check.value.length} chars`, 'cyan');

        // Check if it's the base64 encrypted format (should have 2 colons)
        const colonCount = (check.value.match(/:/g) || []).length;
        if (colonCount !== 2) {
          log(`   ⚠️  WARNING: Expected format is iv:authTag:encrypted (2 colons)`, 'yellow');
          log(`   Found ${colonCount} colons`, 'yellow');
        }
      } else if (check.field === 'connection_pool_config') {
        log(`   Value: ${JSON.stringify(check.value)}`, 'cyan');
      } else {
        log(`   Value: ${check.value}`, 'cyan');
      }
    } else {
      log(`   Value: NULL or empty`, 'red');
      log(`   Expected: ${check.expected}`, 'yellow');
    }
    console.log('');
  });

  log('━'.repeat(60), 'cyan');

  if (allGood) {
    log('\n✅ All critical fields are configured!', 'green');
    log('\nThe tenant record looks good. If Vercel still shows no data, check:', 'cyan');
    log('  1. Vercel environment variables (all 4 tenant DB vars)', 'cyan');
    log('  2. Vercel deployment logs for errors', 'cyan');
    log('  3. Visit /api/debug/tenant-connection on Vercel to see detailed error', 'cyan');
  } else {
    log('\n❌ PROBLEM FOUND: Tenant record is missing critical configuration!', 'red');
    log('\nThis is why Vercel shows no data. The tenant record needs encrypted keys.', 'yellow');
    log('\nTo fix, run this command:', 'cyan');
    log('  npx tsx scripts/encrypt-tenant-keys.ts', 'green');
    log('\nThis will encrypt and store the tenant database credentials.', 'cyan');
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
}

main().catch(console.error);
