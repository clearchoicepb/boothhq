#!/usr/bin/env node

/**
 * Get REAL table count using PostgreSQL system queries
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

async function getTableList(db, dbName) {
  console.log(`\n🔍 Querying ${dbName}...\n`);
  
  // Try to get tables using a raw SQL query
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  try {
    // Try using rpc if available
    const { data, error } = await db.rpc('exec_sql', { sql: query });
    
    if (error) {
      console.log(`   ⚠️  RPC method failed: ${error.message}`);
      console.log(`   Falling back to REST API introspection...`);
      return null;
    }

    console.log(`   ✅ Found ${data.length} tables via SQL query`);
    return data.map(row => row.table_name);
  } catch (err) {
    console.log(`   ⚠️  SQL query failed: ${err.message}`);
    return null;
  }
}

async function getTablesViaREST(db, dbName) {
  console.log(`\n🔍 Using REST API for ${dbName}...\n`);
  
  // Get OpenAPI spec which lists all available tables
  try {
    const response = await fetch(`${db.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': db.supabaseKey,
        'Authorization': `Bearer ${db.supabaseKey}`
      }
    });
    
    if (!response.ok) {
      console.log(`   ❌ Failed to get API spec: ${response.status}`);
      return [];
    }

    const spec = await response.json();
    const tables = Object.keys(spec.definitions || {}).filter(key => 
      !key.startsWith('_') && key !== 'rpc'
    );
    
    console.log(`   ✅ Found ${tables.length} tables via REST API`);
    return tables.sort();
  } catch (err) {
    console.log(`   ❌ REST API failed: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 REAL TABLE COUNT FROM DATABASES');
  console.log('='.repeat(70));

  // Application DB
  let appTables = await getTableList(appDb, 'Application DB');
  if (!appTables) {
    appTables = await getTablesViaREST(appDb, 'Application DB');
  }

  // Tenant DB
  let tenantTables = await getTableList(tenantDb, 'Tenant DB');
  if (!tenantTables) {
    tenantTables = await getTablesViaREST(tenantDb, 'Tenant DB');
  }

  // Display results
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  
  console.log(`\n✅ APPLICATION DB: ${appTables.length} tables`);
  if (appTables.length > 0 && appTables.length <= 50) {
    console.log('\nTables:');
    appTables.forEach((table, i) => console.log(`   ${(i + 1).toString().padStart(2)}. ${table}`));
  }

  console.log(`\n✅ TENANT DB: ${tenantTables.length} tables`);
  if (tenantTables.length > 0 && tenantTables.length <= 50) {
    console.log('\nTables:');
    tenantTables.forEach((table, i) => console.log(`   ${(i + 1).toString().padStart(2)}. ${table}`));
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});


