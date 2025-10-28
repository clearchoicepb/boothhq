#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTenantConfig() {
  console.log('\nChecking tenant configuration...\n');
  
  const { data: tenants, error } = await appDb
    .from('tenants')
    .select('id, name, subdomain, data_source_url, data_source_anon_key, data_source_service_key')
    .limit(5);

  if (error) {
    console.error('Error fetching tenants:', error.message);
    return;
  }

  tenants.forEach(tenant => {
    console.log(`Tenant: ${tenant.name} (${tenant.subdomain})`);
    console.log(`  ID: ${tenant.id}`);
    console.log(`  Data Source URL: ${tenant.data_source_url || 'NOT SET'}`);
    console.log(`  Has Anon Key: ${tenant.data_source_anon_key ? 'YES (encrypted)' : 'NO'}`);
    console.log(`  Has Service Key: ${tenant.data_source_service_key ? 'YES (encrypted)' : 'NO'}`);
    console.log('');
  });
}

checkTenantConfig().catch(console.error);

