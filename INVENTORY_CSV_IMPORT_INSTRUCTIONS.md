# Inventory CSV Import Instructions

This guide will help you import the inventory data from `Inventory Sheet - Inventory.csv` into the new inventory module.

## Phase 1: Run Database Migrations

Before importing data, you need to run two database migrations to:
1. Add the `model` field to the inventory_items table
2. Add the "Misc Item" category

### Step 1: Run Migration Files

Open your Supabase Dashboard (https://supabase.com/dashboard), go to the SQL Editor, and run these migration files in order:

#### Migration 1: Add Model Field
**File:** `supabase/migrations/20251111000000_add_model_to_inventory_items.sql`

```sql
-- Add model column to inventory_items table
-- This allows tracking the specific model/variant of equipment (e.g., "T6", "DS620", "10.5 inch")

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS model VARCHAR(255);

-- Add comment
COMMENT ON COLUMN inventory_items.model IS 'Specific model or variant of the equipment (optional)';
```

#### Migration 2: Add "Misc Item" Category
**File:** `supabase/migrations/20251111000001_add_misc_item_category.sql`

```sql
-- Add "Misc Item" category for uncategorized equipment
-- This will be used for Battery Packs, Hotspots, iPhones, and other items that don't fit existing categories

INSERT INTO item_categories (category_name, sort_order) VALUES
  ('Misc Item', 99)
ON CONFLICT (category_name) DO NOTHING;
```

---

## Phase 2: Create Westlake OH Warehouse Location

Before importing inventory items, you need to create the physical address for the warehouse where all items are located.

### Option A: Create via UI (Recommended)
1. Go to your app's Inventory page
2. Click on the "Physical Addresses" tab
3. Click "Add Physical Address"
4. Fill in the form:
   - **Location Name:** Westlake OH Warehouse
   - **Street Address:** (fill in the actual address)
   - **City:** Westlake
   - **State/Province:** OH
   - **ZIP/Postal Code:** (fill in the actual zip code)
   - **Country:** United States
   - **Notes:** (optional)
5. Save the address
6. **IMPORTANT:** Copy the ID of this location - you'll need it for the import script

### Option B: Create via SQL
Run this in Supabase SQL Editor (replace `YOUR_TENANT_ID` with your actual tenant ID):

```sql
INSERT INTO physical_addresses (
  tenant_id,
  location_name,
  street_address,
  city,
  state_province,
  zip_postal_code,
  country
) VALUES (
  'YOUR_TENANT_ID',
  'Westlake OH Warehouse',
  '123 Main St',  -- Replace with actual address
  'Westlake',
  'OH',
  '44145',  -- Replace with actual zip
  'United States'
) RETURNING id;
```

**Copy the returned ID** - you'll need it for the import script.

---

## Phase 3: Test with One Item

Before bulk importing, let's test with one item to make sure everything works correctly.

Let's use the first item from the CSV:
- **Item ID:** 3P102
- **Device:** 360 Podium
- **Model:** Small
- **Serial Number:** N/A (so we'll use QTY tracking with quantity = 1)
- **Location:** Office → Westlake OH Warehouse
- **Notes:** (empty)

### Test Steps:
1. Go to your Inventory page in the app
2. Click "Add Inventory Item"
3. Fill in the form:
   - **Item Name:** 3P102
   - **Item Category:** Custom Experience (360 Podium maps to this)
   - **Model:** Small
   - **Tracking Type:** Total Quantity (because serial number is N/A)
   - **Total Quantity:** 1
   - **Purchase Date:** (pick a date, e.g., today or Jan 1, 2024)
   - **Item Value:** (enter an estimated value, e.g., 1000)
   - **Assigned To Type:** Physical Address
   - **Assigned To:** Westlake OH Warehouse
   - **Item Notes:** (leave empty)
4. Click "Save"

### Verify:
- The item should appear in your inventory list
- Check that all fields are correct
- Confirm the model field appears and is saved properly

---

## Phase 4: Bulk Import with Script

Once the test item works, you can use the import script to bulk import all 165 items.

The import script is located at: `scripts/import-inventory-csv.ts`

### Before Running the Script:

1. **Get the Westlake OH Warehouse ID:**
   - Query your database: `SELECT id FROM physical_addresses WHERE location_name = 'Westlake OH Warehouse';`
   - Copy the UUID

2. **Update the script with your warehouse ID:**
   - Open `scripts/import-inventory-csv.ts`
   - Replace `WESTLAKE_WAREHOUSE_ID` with the actual ID

### Run the Import:

```bash
# Install dependencies if needed
npm install

# Run the import script
npx tsx scripts/import-inventory-csv.ts
```

The script will:
- Read the CSV file
- Map each row according to the field mappings
- Create inventory items in batches
- Show progress and any errors
- Provide a summary at the end

---

## Field Mappings Reference

| CSV Column | Maps To | Notes |
|------------|---------|-------|
| Item ID | item_name | Used as the item name |
| Location | (ignored) | All items go to Westlake OH Warehouse |
| Device | item_category | See category mappings below |
| Model | model | New optional field |
| Status | (ignored) | |
| Serial Number | serial_number OR total_quantity | If N/A, use QTY=1; otherwise use serial_number tracking |
| Internet | (ignored) | |
| Memory Card | (ignored) | |
| Printer Cover | (ignored) | |
| Notes | item_notes | Copied as-is |
| EID Number | (ignored) | Could be added to notes if needed |

### Category Mappings:

| Device (CSV) | Category (Database) |
|--------------|---------------------|
| 360 Podium | Custom Experience |
| Backdrop | Backdrop |
| Backdrop Frame | Backdrop Stand |
| Battery Pack | Misc Item |
| Camera | Camera |
| Flash | Lighting |
| Hot Spot | Misc Item |
| iPad | iPad |
| iPhone | Misc Item |
| Printer | Printer |
| Ring Light | Lighting |
| Server | Computer |
| Other/Unknown | Misc Item |

### Default Values:

- **Location:** All items assigned to "Westlake OH Warehouse" physical address
- **Assigned To Type:** physical_address
- **Assigned To ID:** (Westlake OH Warehouse UUID)
- **Purchase Date:** 2024-01-01 (placeholder - can be updated later)
- **Item Value:** $0.00 (placeholder - should be updated with actual values)
- **Tracking Type:**
  - "serial_number" if Serial Number is NOT "N/A"
  - "total_quantity" if Serial Number is "N/A" (with quantity = 1)

---

## Troubleshooting

### Migration Errors

**Error: "column model already exists"**
- Solution: Column was already added, safe to skip

**Error: "duplicate key value"** (for Misc Item)
- Solution: Category already exists, safe to skip

### Import Errors

**Error: "category not found"**
- Solution: Make sure you ran the "Add Misc Item Category" migration

**Error: "physical_address not found"**
- Solution: Make sure you created the Westlake OH Warehouse location and updated the script with its ID

**Error: "tracking type validation failed"**
- Solution: Check that serial numbers are properly mapped - N/A values should use total_quantity tracking

---

## Next Steps After Import

1. **Review imported items:**
   - Check that categories are correct
   - Verify models are properly assigned
   - Confirm tracking types are appropriate

2. **Update placeholder values:**
   - Purchase dates (currently set to 2024-01-01)
   - Item values (currently set to $0.00)

3. **Optional enhancements:**
   - Add EID numbers to notes for hotspots/iPads
   - Update with actual purchase information
   - Add photos/images where available

---

## Summary Checklist

- [ ] Run migration 1: Add model field
- [ ] Run migration 2: Add Misc Item category
- [ ] Create Westlake OH Warehouse physical address
- [ ] Copy the warehouse address ID
- [ ] Test with one inventory item (3P102)
- [ ] Verify test item appears correctly
- [ ] Update import script with warehouse ID
- [ ] Run bulk import script
- [ ] Review imported items
- [ ] Update placeholder values as needed

---

**Ready to start?** Begin with Phase 1: Run Database Migrations!
