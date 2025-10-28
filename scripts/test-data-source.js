#!/usr/bin/env node

/**
 * Test Data Source Connection
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import the DataSourceManager
async function testConnection() {
  console.log('\n🔍 Testing Data Source Manager...\n');
  
  // Check environment
  console.log('✓ ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'Set' : 'NOT SET');
  console.log('✓ APP DB URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'NOT SET');
  console.log('✓ DEFAULT_TENANT_DATA_URL:', process.env.DEFAULT_TENANT_DATA_URL ? 'Set' : 'NOT SET');
  
  try {
    // Dynamically import the ESM module
    const { DataSourceManager } = await import('../src/lib/data-sources/manager.js');
    
    console.log('\n✓ DataSourceManager imported successfully');
    
    const tenantId = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
    console.log(`\n🔄 Testing connection for tenant: ${tenantId}`);
    
    const manager = DataSourceManager.getInstance();
    const client = await manager.getClient(tenantId);
    
    console.log('✓ Client obtained successfully');
    
    // Test a simple query
    const { data, error } = await client
      .from('accounts')
      .select('id, name')
      .limit(3);
    
    if (error) {
      console.error('✗ Query error:', error.message);
    } else {
      console.log(`✓ Query successful! Found ${data.length} accounts:`);
      data.forEach(acc => console.log(`  - ${acc.name}`));
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConnection();

