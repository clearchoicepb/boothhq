const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const tenantDbUrl = process.env.DEFAULT_TENANT_DATA_URL;
const tenantDbKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY;

if (!tenantDbUrl || !tenantDbKey) {
  console.error('❌ Missing Tenant DB environment variables');
  process.exit(1);
}

const tenantDb = createClient(tenantDbUrl, tenantDbKey);

async function forceCleanup() {
  console.log('🔧 Force cleaning up invalid line item references...\n');
  console.log('⚠️  This uses SERVICE ROLE KEY to bypass RLS\n');

  try {
    // 1. Get all packages and add-ons IDs
    const { data: packages } = await tenantDb.from('packages').select('id');
    const { data: addOns } = await tenantDb.from('add_ons').select('id');
    
    const packageIds = new Set(packages.map(p => p.id));
    const addOnIds = new Set(addOns.map(a => a.id));

    console.log(`📦 Found ${packages.length} packages`);
    console.log(`📦 Found ${addOns.length} add-ons\n`);

    // 2. Get all line items
    const { data: allLineItems } = await tenantDb
      .from('opportunity_line_items')
      .select('*');

    console.log(`📊 Checking ${allLineItems.length} line items...\n`);

    // 3. Find and fix invalid package_id references
    const invalidPackageItems = allLineItems.filter(
      item => item.package_id && !packageIds.has(item.package_id)
    );

    if (invalidPackageItems.length > 0) {
      console.log(`❌ Found ${invalidPackageItems.length} line items with invalid package_id\n`);
      
      for (const item of invalidPackageItems) {
        console.log(`   Fixing line item: ${item.id}`);
        console.log(`   - Invalid package_id: ${item.package_id}`);
        console.log(`   - Description: ${item.description}`);
        
        const { error } = await tenantDb
          .from('opportunity_line_items')
          .update({ package_id: null })
          .eq('id', item.id);

        if (error) {
          console.log(`   ❌ Failed to update: ${error.message}\n`);
        } else {
          console.log(`   ✅ Set package_id to NULL\n`);
        }
      }
    } else {
      console.log('✅ No invalid package_id references found\n');
    }

    // 4. Find and fix invalid add_on_id references
    const invalidAddOnItems = allLineItems.filter(
      item => item.add_on_id && !addOnIds.has(item.add_on_id)
    );

    if (invalidAddOnItems.length > 0) {
      console.log(`❌ Found ${invalidAddOnItems.length} line items with invalid add_on_id\n`);
      
      for (const item of invalidAddOnItems) {
        console.log(`   Fixing line item: ${item.id}`);
        console.log(`   - Invalid add_on_id: ${item.add_on_id}`);
        console.log(`   - Description: ${item.description}`);
        
        const { error } = await tenantDb
          .from('opportunity_line_items')
          .update({ add_on_id: null })
          .eq('id', item.id);

        if (error) {
          console.log(`   ❌ Failed to update: ${error.message}\n`);
        } else {
          console.log(`   ✅ Set add_on_id to NULL\n`);
        }
      }
    } else {
      console.log('✅ No invalid add_on_id references found\n');
    }

    // 5. Verify cleanup
    console.log('=' .repeat(60));
    console.log('🔍 VERIFICATION\n');

    const { data: verifyLineItems } = await tenantDb
      .from('opportunity_line_items')
      .select('*');

    const stillInvalidPackage = verifyLineItems.filter(
      item => item.package_id && !packageIds.has(item.package_id)
    );

    const stillInvalidAddOn = verifyLineItems.filter(
      item => item.add_on_id && !addOnIds.has(item.add_on_id)
    );

    console.log(`Remaining invalid package_id: ${stillInvalidPackage.length}`);
    console.log(`Remaining invalid add_on_id: ${stillInvalidAddOn.length}\n`);

    if (stillInvalidPackage.length === 0 && stillInvalidAddOn.length === 0) {
      console.log('✅ ✅ ✅ CLEANUP COMPLETE!');
      console.log('You can now run add-missing-business-table-fks.sql');
    } else {
      console.log('❌ Cleanup incomplete - some invalid references remain');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

forceCleanup();

