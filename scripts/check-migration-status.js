#!/usr/bin/env node

/**
 * Check Migration Status
 *
 * This script checks if the dual database migration has been applied
 * to the application database.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('Checking application database migration status...\n');

  // Create client for application database
  const appDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Try to query tenants table with the new columns
  try {
    const { data, error } = await appDb
      .from('tenants')
      .select('id, name, subdomain, data_source_url, data_source_anon_key, data_source_service_key, data_source_region, tenant_id_in_data_source, connection_pool_config')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Migration NOT applied - columns do not exist');
        console.log('   Error:', error.message);
        console.log('\n📝 You need to apply the migration to the application database.');
        console.log('   File: supabase/migrations/20251027000001_add_tenant_data_source_config.sql\n');
        process.exit(1);
      }
      throw error;
    }

    console.log('✅ Migration APPLIED - all columns exist');

    if (data && data.length > 0) {
      console.log('\n📊 Found tenant:');
      console.log('   ID:', data[0].id);
      console.log('   Name:', data[0].name);
      console.log('   Subdomain:', data[0].subdomain);
      console.log('   Data Source URL:', data[0].data_source_url || '(not configured)');
      console.log('   Data Source Region:', data[0].data_source_region || '(not configured)');
      console.log('   Tenant ID in Data Source:', data[0].tenant_id_in_data_source || '(not configured)');

      if (!data[0].data_source_url) {
        console.log('\n⚠️  Tenant does not have data source configured yet.');
      } else {
        console.log('\n✅ Tenant has data source configured!');
      }
    } else {
      console.log('\n⚠️  No tenants found in database.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
