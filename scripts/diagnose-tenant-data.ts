/**
 * Diagnostic script to check tenant data configuration
 *
 * Run with: npx ts-node scripts/diagnose-tenant-data.ts <tenant-id>
 */

import { createServerSupabaseClient } from '../src/lib/supabase-client';
import { getTenantClient, getTenantIdInDataSource } from '../src/lib/data-sources';

async function diagnoseTenantData(tenantId?: string) {
  console.log('=== Tenant Data Diagnostic ===\n');

  const appDb = createServerSupabaseClient();

  // If no tenant ID provided, list all tenants
  if (!tenantId) {
    const { data: tenants, error } = await appDb
      .from('tenants')
      .select('id, name')
      .limit(10);

    if (error) {
      console.error('Error fetching tenants:', error);
      return;
    }

    if (!tenants || tenants.length === 0) {
      console.log('❌ No tenants found!');
      return;
    }

    console.log('Available tenants:');
    tenants.forEach(t => console.log(`  - ${t.id} (${t.name})`));
    console.log('\nUsage: npx ts-node scripts/diagnose-tenant-data.ts <tenant-id>');
    return;
  }

  console.log(`Checking tenant: ${tenantId}\n`);

  // Step 1: Check tenant configuration in application DB
  console.log('Step 1: Checking application database configuration...');
  const { data: tenant, error: tenantError } = await appDb
    .from('tenants')
    .select(`
      id,
      name,
      data_source_url,
      tenant_id_in_data_source,
      data_source_anon_key,
      data_source_service_key
    `)
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Tenant not found in application database:', tenantError);
    return;
  }

  console.log('✅ Tenant found in application database');
  console.log(`   Name: ${tenant.name}`);
  console.log(`   Data Source URL: ${tenant.data_source_url || '❌ NOT CONFIGURED'}`);
  console.log(`   Tenant ID in Data Source: ${tenant.tenant_id_in_data_source || '(defaults to tenant ID)'}`);
  console.log(`   Has encrypted keys: ${tenant.data_source_anon_key && tenant.data_source_service_key ? '✅' : '❌'}`);

  if (!tenant.data_source_url) {
    console.log('\n❌ CRITICAL: No data_source_url configured!');
    console.log('   API routes will fail to connect to tenant database.');
    return;
  }

  // Step 2: Get mapped tenant ID
  console.log('\nStep 2: Getting mapped tenant ID...');
  try {
    const mappedTenantId = await getTenantIdInDataSource(tenantId);
    console.log(`✅ Mapped tenant ID: ${mappedTenantId}`);

    if (mappedTenantId !== tenantId) {
      console.log(`   ⚠️  IMPORTANT: Tenant ID mapping is active!`);
      console.log(`   Application uses: ${tenantId}`);
      console.log(`   Data source uses: ${mappedTenantId}`);
      console.log(`   All queries MUST use: ${mappedTenantId}`);
    } else {
      console.log(`   No tenant ID mapping (using same ID for both)`);
    }

    // Step 3: Connect to tenant database
    console.log('\nStep 3: Connecting to tenant database...');
    const tenantDb = await getTenantClient(tenantId, true);
    console.log('✅ Connected to tenant database');

    // Step 4: Check what tenant_id values exist in the data
    console.log('\nStep 4: Checking actual data in tenant database...');

    const tables = ['accounts', 'contacts', 'events', 'opportunities'];
    const dataCheck: any = {};

    for (const table of tables) {
      try {
        // Get distinct tenant_id values
        const { data: distinctIds, error: distinctError } = await tenantDb
          .from(table as any)
          .select('tenant_id')
          .limit(1000);

        if (distinctError) {
          dataCheck[table] = { error: distinctError.message };
          continue;
        }

        if (!distinctIds || distinctIds.length === 0) {
          dataCheck[table] = { count: 0, tenantIds: [] };
          continue;
        }

        // Get unique tenant_id values
        const uniqueTenantIds = [...new Set(distinctIds.map((row: any) => row.tenant_id))];

        dataCheck[table] = {
          count: distinctIds.length,
          tenantIds: uniqueTenantIds,
        };

      } catch (error: any) {
        dataCheck[table] = { error: error.message };
      }
    }

    // Display results
    console.log('\nData found in tenant database:');
    for (const [table, info] of Object.entries(dataCheck)) {
      const typedInfo = info as any;
      if (typedInfo.error) {
        console.log(`  ${table}: ❌ Error: ${typedInfo.error}`);
      } else {
        console.log(`  ${table}: ${typedInfo.count} records`);
        if (typedInfo.tenantIds && typedInfo.tenantIds.length > 0) {
          console.log(`    Tenant IDs in data: ${typedInfo.tenantIds.join(', ')}`);

          // Check if any data uses the mapped tenant ID
          const hasCorrectId = typedInfo.tenantIds.includes(mappedTenantId);
          const hasOldId = typedInfo.tenantIds.includes(tenantId) && mappedTenantId !== tenantId;

          if (hasCorrectId) {
            console.log(`    ✅ Data uses correct tenant ID: ${mappedTenantId}`);
          }
          if (hasOldId) {
            console.log(`    ⚠️  Data uses old application tenant ID: ${tenantId}`);
            console.log(`    ⚠️  Queries with ${mappedTenantId} will return NO RESULTS!`);
          }
          if (!hasCorrectId && !hasOldId) {
            console.log(`    ⚠️  Data uses unexpected tenant ID(s)`);
          }
        }
      }
    }

    // Step 5: Diagnosis
    console.log('\n=== DIAGNOSIS ===');

    const hasMismatch = Object.values(dataCheck).some((info: any) =>
      info.tenantIds && info.tenantIds.length > 0 &&
      !info.tenantIds.includes(mappedTenantId) &&
      info.tenantIds.includes(tenantId)
    );

    if (hasMismatch && mappedTenantId !== tenantId) {
      console.log('❌ ISSUE FOUND: Tenant ID mismatch');
      console.log('\nProblem:');
      console.log(`  - Your data was created with tenant_id = ${tenantId} (application ID)`);
      console.log(`  - But tenant_id_in_data_source is set to: ${mappedTenantId}`);
      console.log(`  - API routes now query with: ${mappedTenantId}`);
      console.log(`  - Result: No data returned ❌`);
      console.log('\nSolution:');
      console.log('  Option 1: Update tenant_id_in_data_source to NULL in tenants table');
      console.log(`            UPDATE tenants SET tenant_id_in_data_source = NULL WHERE id = '${tenantId}';`);
      console.log('\n  Option 2: Update all data to use the mapped tenant_id');
      console.log(`            UPDATE accounts SET tenant_id = '${mappedTenantId}' WHERE tenant_id = '${tenantId}';`);
      console.log(`            UPDATE contacts SET tenant_id = '${mappedTenantId}' WHERE tenant_id = '${tenantId}';`);
      console.log('            (repeat for all tables)');
    } else {
      const totalRecords = Object.values(dataCheck).reduce((sum: number, info: any) =>
        sum + (info.count || 0), 0
      );

      if (totalRecords === 0) {
        console.log('⚠️  No data found in any table');
        console.log('   Either the tenant database is empty, or there\'s a connection issue.');
      } else {
        console.log('✅ Configuration looks correct');
        console.log(`   Found ${totalRecords} total records across tables`);
        console.log('   Tenant ID mapping matches the data');
      }
    }

  } catch (error: any) {
    console.error('❌ Error during diagnosis:', error);
  }
}

const tenantId = process.argv[2];
diagnoseTenantData(tenantId)
  .then(() => {
    console.log('\nDiagnostic complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  });
