#!/usr/bin/env ts-node

/**
 * Dual Database Setup Test Script
 *
 * This script verifies that the dual database architecture is working correctly.
 *
 * Usage: npx ts-node scripts/test-dual-database-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

// Colors for terminal output
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

function logTest(result: TestResult) {
  const icon = result.passed ? '✓' : '✗';
  const color = result.passed ? 'green' : 'red';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  log(`${icon} ${result.test}${duration}`, color);
  if (!result.passed) {
    log(`  └─ ${result.message}`, 'red');
  }
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    return { test: name, passed: true, message: 'Success', duration };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

async function main() {
  console.clear();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🧪 Dual Database Setup - Verification Tests', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');

  // Test 1: Check environment variables
  log('📋 Test 1: Environment Variables', 'blue');
  results.push(
    await runTest('APPLICATION_DATABASE_URL exists', async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
      }
    })
  );
  results.push(
    await runTest('APPLICATION_DATABASE_ANON_KEY exists', async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
      }
    })
  );
  results.push(
    await runTest('APPLICATION_DATABASE_SERVICE_KEY exists', async () => {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
      }
    })
  );
  results.push(
    await runTest('TENANT_DATA_DATABASE_URL exists', async () => {
      if (!process.env.DEFAULT_TENANT_DATA_URL) {
        throw new Error('DEFAULT_TENANT_DATA_URL not found in .env.local');
      }
    })
  );
  results.push(
    await runTest('TENANT_DATA_DATABASE_ANON_KEY exists', async () => {
      if (!process.env.DEFAULT_TENANT_DATA_ANON_KEY) {
        throw new Error('DEFAULT_TENANT_DATA_ANON_KEY not found in .env.local');
      }
    })
  );
  results.push(
    await runTest('TENANT_DATA_DATABASE_SERVICE_KEY exists', async () => {
      if (!process.env.DEFAULT_TENANT_DATA_SERVICE_KEY) {
        throw new Error('DEFAULT_TENANT_DATA_SERVICE_KEY not found in .env.local');
      }
    })
  );
  results.push(
    await runTest('ENCRYPTION_KEY exists', async () => {
      if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY not found in .env.local');
      }
      if (process.env.ENCRYPTION_KEY.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 characters');
      }
    })
  );

  results.forEach(logTest);
  console.log('');

  // Create clients
  const appDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tenantDb = createClient(
    process.env.DEFAULT_TENANT_DATA_URL!,
    process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!
  );

  // Test 2: Application Database Connection
  log('📡 Test 2: Application Database Connection', 'blue');
  const appDbTests: TestResult[] = [];

  appDbTests.push(
    await runTest('Connect to application database', async () => {
      const { error } = await appDb.from('tenants').select('count').single();
      if (error && error.code !== 'PGRST116') throw error;
    })
  );

  appDbTests.push(
    await runTest('Tenants table exists', async () => {
      const { data, error } = await appDb.from('tenants').select('id').limit(1);
      if (error) throw error;
    })
  );

  appDbTests.push(
    await runTest('Users table exists', async () => {
      const { data, error } = await appDb.from('users').select('id').limit(1);
      if (error) throw error;
    })
  );

  appDbTests.push(
    await runTest('Audit_log table exists', async () => {
      const { data, error } = await appDb.from('audit_log').select('id').limit(1);
      if (error) throw error;
    })
  );

  appDbTests.push(
    await runTest('Tenant connection config columns exist', async () => {
      const { data, error } = await appDb
        .from('tenants')
        .select('id, data_source_url, data_source_anon_key, data_source_service_key')
        .limit(1);
      if (error) throw error;
    })
  );

  results.push(...appDbTests);
  appDbTests.forEach(logTest);
  console.log('');

  // Test 3: Tenant Data Database Connection
  log('📡 Test 3: Tenant Data Database Connection', 'blue');
  const tenantDbTests: TestResult[] = [];

  tenantDbTests.push(
    await runTest('Connect to tenant data database', async () => {
      const { error } = await tenantDb.from('accounts').select('count').single();
      if (error && error.code !== 'PGRST116') throw error;
    })
  );

  const businessTables = [
    'accounts',
    'contacts',
    'contact_accounts',
    'leads',
    'opportunities',
    'events',
    'event_dates',
    'locations',
    'invoices',
    'invoice_line_items',
    'payments',
    'quotes',
    'tasks',
    'contracts',
    'attachments',
    'communications',
    'notes',
  ];

  for (const table of businessTables.slice(0, 5)) {
    tenantDbTests.push(
      await runTest(`${table} table exists`, async () => {
        const { error } = await tenantDb.from(table).select('id').limit(1);
        if (error) throw error;
      })
    );
  }

  results.push(...tenantDbTests);
  tenantDbTests.forEach(logTest);
  console.log('');

  // Test 4: Tenant Record Configuration
  log('🔗 Test 4: Tenant Record Configuration', 'blue');
  const tenantConfigTests: TestResult[] = [];

  let tenantId: string | undefined;

  tenantConfigTests.push(
    await runTest('Find default tenant', async () => {
      const { data, error } = await appDb.from('tenants').select('id').limit(1).single();
      if (error) throw error;
      if (!data) throw new Error('No tenant found');
      tenantId = data.id;
    })
  );

  tenantConfigTests.push(
    await runTest('Tenant has data_source_url configured', async () => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const { data, error } = await appDb
        .from('tenants')
        .select('data_source_url')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      if (!data?.data_source_url) {
        throw new Error('data_source_url is not configured for tenant');
      }
    })
  );

  tenantConfigTests.push(
    await runTest('Tenant has data_source_anon_key configured', async () => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const { data, error } = await appDb
        .from('tenants')
        .select('data_source_anon_key')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      if (!data?.data_source_anon_key) {
        throw new Error('data_source_anon_key is not configured for tenant');
      }
    })
  );

  tenantConfigTests.push(
    await runTest('Tenant has data_source_service_key configured', async () => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const { data, error } = await appDb
        .from('tenants')
        .select('data_source_service_key')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      if (!data?.data_source_service_key) {
        throw new Error('data_source_service_key is not configured for tenant');
      }
    })
  );

  tenantConfigTests.push(
    await runTest('Tenant has tenant_id_in_data_source configured', async () => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const { data, error } = await appDb
        .from('tenants')
        .select('tenant_id_in_data_source')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      if (!data?.tenant_id_in_data_source) {
        throw new Error('tenant_id_in_data_source is not configured for tenant');
      }
    })
  );

  results.push(...tenantConfigTests);
  tenantConfigTests.forEach(logTest);
  console.log('');

  // Test 5: Data Routing (if DataSourceManager is available)
  log('🔀 Test 5: Data Routing', 'blue');

  // Try to import DataSourceManager
  let hasDataSourceManager = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dataSourceManager } = require('../src/lib/data-sources');
    hasDataSourceManager = true;

    if (tenantId) {
      results.push(
        await runTest('DataSourceManager.getTenantConnectionConfig', async () => {
          const config = await dataSourceManager.getTenantConnectionConfig(tenantId!);
          if (!config) throw new Error('Failed to get tenant connection config');
          if (!config.data_source_url) throw new Error('data_source_url is missing');
        })
      );

      results.push(
        await runTest('DataSourceManager.getClientForTenant', async () => {
          const client = await dataSourceManager.getClientForTenant(tenantId!, true);
          if (!client) throw new Error('Failed to get client for tenant');

          // Test query
          const { error } = await client.from('accounts').select('count').single();
          if (error && error.code !== 'PGRST116') throw error;
        })
      );

      results.push(
        await runTest('DataSourceManager.testTenantConnection', async () => {
          const result = await dataSourceManager.testTenantConnection(tenantId!);
          if (!result.success) {
            throw new Error(`Connection test failed: ${result.error}`);
          }
        })
      );
    }
  } catch (error) {
    results.push({
      test: 'DataSourceManager availability',
      passed: false,
      message: 'DataSourceManager not found or not configured yet',
    });
  }

  results.filter((r) => r.test.includes('DataSourceManager')).forEach(logTest);
  console.log('');

  // Summary
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📊 Test Summary', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const passRate = Math.round((passed / total) * 100);

  log(`Total Tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`Pass Rate: ${passRate}%`, passRate === 100 ? 'green' : passRate > 70 ? 'yellow' : 'red');
  console.log('');

  if (failed === 0) {
    log('🎉 All tests passed! Your dual database setup is working correctly.', 'green');
    console.log('');
    log('Next steps:', 'blue');
    console.log('  1. Start your application: npm run dev');
    console.log('  2. Test creating/reading data through the UI');
    console.log('  3. Monitor logs for any database connection issues');
    console.log('');
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
    console.log('');
    log('Troubleshooting:', 'blue');
    console.log('  1. Check DUAL_DATABASE_SETUP_GUIDE.md for setup instructions');
    console.log('  2. Verify all environment variables in .env.local');
    console.log('  3. Ensure migrations have been run on both databases');
    console.log('  4. Check tenant record has connection info configured');
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('');
  log('❌ Test script failed:', 'red');
  console.error(error);
  console.error('');
  process.exit(1);
});
