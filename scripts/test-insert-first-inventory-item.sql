-- Test inserting the first inventory item from CSV
-- Item: 3P102 - 360 Podium (Small)

-- Replace YOUR_TENANT_ID with your actual tenant ID
-- The script will insert the first item from the CSV as a test

INSERT INTO inventory_items (
  tenant_id,
  item_name,
  item_category,
  model,
  tracking_type,
  total_quantity,
  purchase_date,
  item_value,
  assigned_to_type,
  assigned_to_id,
  item_notes
) VALUES (
  'YOUR_TENANT_ID',  -- REPLACE THIS WITH YOUR ACTUAL TENANT ID
  '3P102',           -- Item ID from CSV
  'Custom Experience',  -- 360 Podium maps to Custom Experience
  'Small',           -- Model from CSV
  'total_quantity',  -- Using quantity tracking because serial number is N/A
  1,                 -- Quantity = 1
  '2024-01-01',     -- Placeholder purchase date
  0.00,              -- Placeholder value (update with actual price later)
  'physical_address',  -- Assigning to physical address
  '1bf13de1-6148-4919-8978-dd9f7252f298',  -- Westlake OH Warehouse
  NULL               -- No notes for this item
) RETURNING *;

-- After running this, verify:
-- 1. The item appears in your inventory list
-- 2. Item name is "3P102"
-- 3. Category is "Custom Experience"
-- 4. Model is "Small"
-- 5. Tracking type is "total_quantity" with quantity = 1
-- 6. Assigned to "Westlake OH Warehouse"
