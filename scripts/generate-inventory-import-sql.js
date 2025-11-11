/**
 * Generate SQL import script from Inventory CSV
 *
 * Usage: node scripts/generate-inventory-import-sql.js
 *
 * This will read the "Inventory Sheet - Inventory.csv" file and generate
 * a complete SQL script to import all items into the inventory_items table.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CSV_FILE = 'Inventory Sheet - Inventory.csv';
const OUTPUT_FILE = 'scripts/generated-inventory-import.sql';
const WESTLAKE_WAREHOUSE_ID = '1bf13de1-6148-4919-8978-dd9f7252f298';

// Category mapping
const CATEGORY_MAP = {
  '360 Podium': 'Custom Experience',
  'Backdrop': 'Backdrop',
  'Backdrop Frame': 'Backdrop Stand',
  'Battery Pack': 'Misc Item',
  'Camera': 'Camera',
  'Flash': 'Lighting',
  'Hot Spot': 'Misc Item',
  'iPad': 'iPad',
  'iPhone': 'Misc Item',
  'Printer': 'Printer',
  'Ring Light': 'Lighting',
  'Server': 'Computer',
};

function mapCategory(device) {
  return CATEGORY_MAP[device] || 'Misc Item';
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function escapeSQL(str) {
  if (!str || str === 'N/A' || str === '') return null;
  return str.replace(/'/g, "''");
}

function generateInsertStatement(row, tenantId, duplicateSerials) {
  const [itemId, location, device, model, status, serialNumber, internet, memoryCard, printerCover, notes, eidNumber] = row;

  // Skip header row and empty rows
  if (itemId === 'Item ID' || !itemId || itemId.trim() === '') {
    return null;
  }

  // Skip TRASH items
  if (location === 'TRASH' || status === 'TRASH') {
    return null;
  }

  const category = mapCategory(device);

  // Determine tracking type
  // If serial number exists, is not N/A, and is NOT a duplicate, use serial tracking
  const hasSerial = serialNumber && serialNumber !== 'N/A' && serialNumber !== '';
  const isDuplicate = hasSerial && duplicateSerials.has(serialNumber);
  const useSerialTracking = hasSerial && !isDuplicate;
  const trackingType = useSerialTracking ? 'serial_number' : 'total_quantity';

  // Prepare values
  const itemName = escapeSQL(itemId);
  const itemCategory = category;
  const itemModel = escapeSQL(model);
  const serial = useSerialTracking ? `'${escapeSQL(serialNumber)}'` : 'NULL';
  const quantity = useSerialTracking ? 'NULL' : '1';
  const itemNotes = notes && notes !== '' ? `'${escapeSQL(notes)}'` : 'NULL';

  return `('${tenantId}', '${itemName}', '${itemCategory}', ${itemModel ? `'${itemModel}'` : 'NULL'}, '${trackingType}', ${serial}, ${quantity}, '2024-01-01', 0.00, 'physical_address', '${WESTLAKE_WAREHOUSE_ID}', ${itemNotes})`;
}

function main() {
  console.log('Reading CSV file...');

  const csvPath = path.join(__dirname, '..', CSV_FILE);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  console.log(`Found ${lines.length} lines in CSV`);

  // First pass: identify duplicate serial numbers
  const serialCounts = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    const [itemId, location, device, model, status, serialNumber] = row;

    // Skip header, empty rows, and TRASH items
    if (itemId === 'Item ID' || !itemId || itemId.trim() === '' || location === 'TRASH' || status === 'TRASH') {
      continue;
    }

    // Count serial numbers (ignore N/A and empty)
    if (serialNumber && serialNumber !== 'N/A' && serialNumber !== '') {
      serialCounts.set(serialNumber, (serialCounts.get(serialNumber) || 0) + 1);
    }
  }

  // Identify duplicates
  const duplicateSerials = new Set();
  for (const [serial, count] of serialCounts.entries()) {
    if (count > 1) {
      duplicateSerials.add(serial);
      console.log(`  Found duplicate serial: "${serial}" (appears ${count} times - will use quantity tracking)`);
    }
  }

  console.log(`\nIdentified ${duplicateSerials.size} duplicate serial numbers`);

  // Second pass: generate INSERT statements
  const insertStatements = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    const statement = generateInsertStatement(row, 'YOUR_TENANT_ID', duplicateSerials);

    if (statement) {
      insertStatements.push(statement);
    } else {
      skipped++;
    }
  }

  console.log(`Generated ${insertStatements.length} INSERT statements`);
  console.log(`Skipped ${skipped} rows (header, empty, or TRASH)`);

  // Generate complete SQL file
  const sqlContent = `-- Auto-generated Inventory Import Script
-- Generated: ${new Date().toISOString()}
-- Source: ${CSV_FILE}
--
-- BEFORE RUNNING:
-- 1. Replace 'YOUR_TENANT_ID' with your actual tenant ID
-- 2. Verify Westlake OH Warehouse address exists with ID: ${WESTLAKE_WAREHOUSE_ID}
-- 3. Make sure you've run the model and category migrations first
--
-- To get your tenant ID, run: SELECT id FROM tenants LIMIT 1;

BEGIN;

INSERT INTO inventory_items (
  tenant_id,
  item_name,
  item_category,
  model,
  tracking_type,
  serial_number,
  total_quantity,
  purchase_date,
  item_value,
  assigned_to_type,
  assigned_to_id,
  item_notes
) VALUES
${insertStatements.join(',\n')};

COMMIT;

-- Verify import
SELECT
  item_category,
  COUNT(*) as count
FROM inventory_items
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your tenant ID
GROUP BY item_category
ORDER BY count DESC;

-- Check total count
SELECT COUNT(*) as total_items
FROM inventory_items
WHERE tenant_id = 'YOUR_TENANT_ID';  -- Replace with your tenant ID
`;

  // Write to output file
  const outputPath = path.join(__dirname, '..', OUTPUT_FILE);
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');

  console.log(`\nSQL script generated successfully!`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE}`);
  console.log(`2. Replace 'YOUR_TENANT_ID' with your actual tenant ID`);
  console.log(`3. Run the SQL script in Supabase SQL Editor`);
}

try {
  main();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
