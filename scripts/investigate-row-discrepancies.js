#!/usr/bin/env node

/**
 * Investigate Row Count Discrepancies
 * 
 * Identifies specific records that exist in App DB but not in Tenant DB
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

// Tables with discrepancies from the comparison
const TABLES_TO_CHECK = [
  'accounts',
  'contacts',
  'contact_accounts',
  'leads'
];

function box(title) {
  const width = 80;
  console.log('\n' + '═'.repeat(width));
  console.log(title);
  console.log('═'.repeat(width));
}

async function investigateTable(tableName) {
  box(`TABLE: ${tableName.toUpperCase()}`);

  // Get all records from App DB
  const { data: appData, error: appError } = await appDb
    .from(tableName)
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('created_at');

  if (appError) {
    console.log(`❌ Error reading from App DB: ${appError.message}`);
    return null;
  }

  // Get all records from Tenant DB
  const { data: tenantData, error: tenantError } = await tenantDb
    .from(tableName)
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('created_at');

  if (tenantError) {
    console.log(`❌ Error reading from Tenant DB: ${tenantError.message}`);
    return null;
  }

  console.log(`\n📊 Count Summary:`);
  console.log(`   App DB:    ${appData.length} records`);
  console.log(`   Tenant DB: ${tenantData.length} records`);
  console.log(`   Missing:   ${appData.length - tenantData.length} records\n`);

  if (appData.length === tenantData.length) {
    console.log('✅ No discrepancy - counts match');
    return null;
  }

  // Find missing records (in App but not in Tenant)
  const tenantIds = new Set(tenantData.map(r => r.id));
  const missingRecords = appData.filter(r => !tenantIds.has(r.id));

  if (missingRecords.length === 0) {
    console.log('⚠️  Counts differ but no missing IDs detected');
    console.log('   This might mean Tenant DB has extra records');
    
    // Check for extra records in Tenant DB
    const appIds = new Set(appData.map(r => r.id));
    const extraRecords = tenantData.filter(r => !appIds.has(r.id));
    
    if (extraRecords.length > 0) {
      console.log(`\n   Tenant DB has ${extraRecords.length} extra record(s):`);
      extraRecords.forEach((rec, idx) => {
        const name = rec.name || rec.company_name || rec.first_name || rec.id;
        console.log(`   ${idx + 1}. ${name} (ID: ${rec.id.substring(0, 8)}...)`);
      });
    }
    
    return null;
  }

  console.log(`🔍 Missing Records in Tenant DB (${missingRecords.length}):\n`);
  
  missingRecords.forEach((record, idx) => {
    console.log(`${idx + 1}. ${getRecordSummary(tableName, record)}`);
    console.log(`   ID: ${record.id}`);
    console.log(`   Created: ${record.created_at || 'Unknown'}`);
    console.log(`   Updated: ${record.updated_at || 'Unknown'}`);
    console.log('');
  });

  return {
    table: tableName,
    missingRecords,
    count: missingRecords.length
  };
}

function getRecordSummary(tableName, record) {
  switch (tableName) {
    case 'accounts':
      return `Account: ${record.company_name || 'Unnamed'} (Type: ${record.account_type || 'Unknown'})`;
    
    case 'contacts':
      return `Contact: ${record.first_name || ''} ${record.last_name || ''} (${record.email || 'No email'})`;
    
    case 'contact_accounts':
      const role = record.role || 'No role';
      return `Contact-Account Link (Role: ${role}, Primary: ${record.is_primary_contact ? 'Yes' : 'No'})`;
    
    case 'leads':
      return `Lead: ${record.company_name || record.first_name || 'Unnamed'} (Status: ${record.status || 'Unknown'})`;
    
    default:
      return `Record (${JSON.stringify(record).substring(0, 50)}...)`;
  }
}

async function main() {
  box('ROW DISCREPANCY INVESTIGATION');
  console.log('\nAnalyzing differences between Application DB and Tenant DB...');
  console.log(`Tenant ID: ${TENANT_ID}\n`);

  const results = [];

  for (const table of TABLES_TO_CHECK) {
    const result = await investigateTable(table);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  box('SUMMARY & RECOMMENDATIONS');
  
  if (results.length === 0) {
    console.log('\n✅ No missing records found!');
    console.log('   All data is properly synced between databases.\n');
    return;
  }

  const totalMissing = results.reduce((sum, r) => sum + r.count, 0);
  
  console.log(`\n⚠️  Found ${totalMissing} record(s) in App DB that are missing from Tenant DB:\n`);
  
  results.forEach(r => {
    console.log(`   • ${r.table}: ${r.count} record(s)`);
  });

  console.log('\n📋 Next Steps:');
  console.log('   1. Review the missing records above');
  console.log('   2. Determine if they should be migrated to Tenant DB');
  console.log('   3. Run migration script if needed:');
  console.log('      node scripts/migrate-missing-records.js');
  console.log('\n   Note: According to your architecture, ALL tenant business');
  console.log('   data should be in Tenant DB, not Application DB.\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});

