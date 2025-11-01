/**
 * Diagnostic script to check tenant configuration
 *
 * Run with: npx ts-node scripts/diagnose-tenant-config.ts
 */

import { createServerSupabaseClient } from '../src/lib/supabase-client';

async function diagnoseTenantConfig() {
  console.log('=== Tenant Configuration Diagnostic ===\n');

  const appDb = createServerSupabaseClient();

  // Fetch all tenants
  const { data: tenants, error } = await appDb
    .from('tenants')
    .select(`
      id,
      name,
      data_source_url,
      tenant_id_in_data_source,
      data_source_anon_key,
      data_source_service_key
    `);

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  if (!tenants || tenants.length === 0) {
    console.log('❌ No tenants found in database!');
    return;
  }

  console.log(`Found ${tenants.length} tenant(s):\n`);

  for (const tenant of tenants) {
    console.log(`Tenant: ${tenant.name}`);
    console.log(`  ID: ${tenant.id}`);
    console.log(`  Data Source URL: ${tenant.data_source_url || '❌ NOT CONFIGURED'}`);
    console.log(`  Tenant ID in Data Source: ${tenant.tenant_id_in_data_source || '(same as tenant ID)'}`);
    console.log(`  Has Anon Key: ${tenant.data_source_anon_key ? '✅ Yes' : '❌ No'}`);
    console.log(`  Has Service Key: ${tenant.data_source_service_key ? '✅ Yes' : '❌ No'}`);

    // Check if tenant has data source configured
    if (!tenant.data_source_url) {
      console.log('  ⚠️  WARNING: This tenant has no data source URL configured!');
      console.log('  ⚠️  All API routes will fail to fetch data for this tenant.');
    } else {
      console.log('  ✅ Data source is configured');
    }
    console.log('');
  }

  console.log('\n=== Recommendations ===');
  const missingDataSource = tenants.filter(t => !t.data_source_url);

  if (missingDataSource.length > 0) {
    console.log('❌ Issues found:');
    console.log(`   ${missingDataSource.length} tenant(s) missing data_source_url`);
    console.log('\nTo fix, you need to:');
    console.log('1. Set up a Supabase project for tenant data');
    console.log('2. Update the tenant record with connection details:');
    console.log('   - data_source_url (Supabase URL)');
    console.log('   - data_source_anon_key (encrypted anon key)');
    console.log('   - data_source_service_key (encrypted service role key)');
    console.log('   - tenant_id_in_data_source (if different from tenant.id)');
  } else {
    console.log('✅ All tenants have data sources configured');
  }
}

diagnoseTenantConfig()
  .then(() => {
    console.log('\nDiagnostic complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  });
