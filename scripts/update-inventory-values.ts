#!/usr/bin/env ts-node

/**
 * Update Inventory Item Values
 *
 * This script updates inventory item values based on their category.
 *
 * Usage: npx ts-node scripts/update-inventory-values.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

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

// Category to value mapping
const CATEGORY_VALUES: Record<string, number> = {
  'Printers': 950.00,
  'Cameras': 450.00,
  'Lighting': 250.00,
  'iPads': 250.00,
  'Backdrops': 90.00,
  'Backdrop Stands': 220.00,
  'Hotspots': 150.00,
  'Computer': 200.00,
};

async function updateInventoryValues() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('Error: Missing Supabase credentials in .env.local', 'red');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  log('\n📦 Starting Inventory Values Update...', 'cyan');
  log('═══════════════════════════════════════\n', 'cyan');

  try {
    // First, get all inventory items to see what we're working with
    const { data: allItems, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, item_name, item_category, item_value');

    if (fetchError) {
      log(`Error fetching items: ${fetchError.message}`, 'red');
      process.exit(1);
    }

    log(`Found ${allItems?.length || 0} total items`, 'blue');

    // Update each category
    let totalUpdated = 0;
    for (const [category, value] of Object.entries(CATEGORY_VALUES)) {
      const itemsToUpdate = allItems?.filter(item => item.item_category === category) || [];

      if (itemsToUpdate.length === 0) {
        log(`  ${category}: No items found`, 'yellow');
        continue;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .update({ item_value: value })
        .eq('item_category', category)
        .select();

      if (error) {
        log(`  ${category}: Error - ${error.message}`, 'red');
      } else {
        const count = data?.length || 0;
        totalUpdated += count;
        log(`  ${category}: Updated ${count} items to $${value}`, 'green');
      }
    }

    log(`\n✅ Successfully updated ${totalUpdated} inventory items`, 'green');
    log('═══════════════════════════════════════\n', 'cyan');

  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
updateInventoryValues();
