#!/usr/bin/env node

/**
 * Add sort_order column to invoice_line_items in Tenant Database
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

async function addSortOrderColumn() {
  console.log('\n🔧 Adding sort_order column to invoice_line_items...\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Add the column
    console.log('\n📝 Step 1: Adding sort_order column...');
    const { error: alterError } = await tenantDb.rpc('exec_sql', {
      sql: `
        ALTER TABLE invoice_line_items
        ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      `
    });

    if (alterError) {
      // If exec_sql RPC doesn't exist, try direct SQL via supabase-js
      // This won't work with ALTER TABLE, so we'll provide instructions instead
      console.log('\n⚠️  Cannot add column programmatically.');
      console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
      console.log('\n' + '-'.repeat(70));
      console.log(`
-- Add sort_order column to invoice_line_items
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing records to have sort_order based on created_at
UPDATE invoice_line_items
SET sort_order = subquery.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY created_at) - 1 as row_num
  FROM invoice_line_items
  WHERE sort_order = 0 OR sort_order IS NULL
) AS subquery
WHERE invoice_line_items.id = subquery.id;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_sort_order
  ON invoice_line_items(invoice_id, sort_order);
      `);
      console.log('-'.repeat(70));
      console.log('\n💡 After running the SQL, the drag/drop reorder will work!\n');
      return;
    }

    console.log('✅ Column added successfully!');

    // Step 2: Update existing records
    console.log('\n📝 Step 2: Setting sort_order for existing records...');

    // Get all invoices
    const { data: invoices, error: invoicesError } = await tenantDb
      .from('invoices')
      .select('id');

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return;
    }

    console.log(`   Found ${invoices.length} invoices`);

    // For each invoice, order line items by created_at and set sort_order
    for (const invoice of invoices) {
      const { data: lineItems, error: lineItemsError } = await tenantDb
        .from('invoice_line_items')
        .select('id')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error(`   ❌ Error fetching line items for invoice ${invoice.id}:`, lineItemsError);
        continue;
      }

      // Update sort_order for each line item
      for (let i = 0; i < lineItems.length; i++) {
        const { error: updateError } = await tenantDb
          .from('invoice_line_items')
          .update({ sort_order: i })
          .eq('id', lineItems[i].id);

        if (updateError) {
          console.error(`   ❌ Error updating line item ${lineItems[i].id}:`, updateError);
        }
      }

      console.log(`   ✅ Updated ${lineItems.length} line items for invoice ${invoice.id}`);
    }

    console.log('\n✅ Step 2 complete!');

    // Step 3: Verify
    console.log('\n📝 Step 3: Verifying column exists...');
    const { data: verifyData, error: verifyError } = await tenantDb
      .from('invoice_line_items')
      .select('id, sort_order')
      .limit(5);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Verification passed!');
      console.log('   Sample data:', verifyData);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Migration complete! Drag/drop reorder should now work.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

addSortOrderColumn().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
