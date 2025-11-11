-- Fix items that are in product groups but have inconsistent assignments
-- This script makes items inherit their product group's assignment

-- Step 1: View items that need fixing
SELECT
  i.id as item_id,
  i.item_name,
  i.assigned_to_type as current_item_assigned_to_type,
  i.assigned_to_id as current_item_assigned_to_id,
  pg.id as product_group_id,
  pg.group_name,
  pg.assigned_to_type as group_assigned_to_type,
  pg.assigned_to_id as group_assigned_to_id,
  CASE
    WHEN i.assigned_to_type = pg.assigned_to_type AND i.assigned_to_id = pg.assigned_to_id THEN 'Consistent'
    ELSE 'NEEDS FIX'
  END as status
FROM inventory_items i
INNER JOIN product_group_items pgi ON pgi.inventory_item_id = i.id
INNER JOIN product_groups pg ON pg.id = pgi.product_group_id
WHERE i.assigned_to_type != pg.assigned_to_type
   OR i.assigned_to_id != pg.assigned_to_id
   OR i.assigned_to_type IS NULL
   OR i.assigned_to_id IS NULL;

-- Step 2: Fix the assignments (uncomment to execute)
-- UPDATE inventory_items i
-- SET
--   assigned_to_type = pg.assigned_to_type,
--   assigned_to_id = pg.assigned_to_id,
--   updated_at = NOW()
-- FROM product_group_items pgi
-- INNER JOIN product_groups pg ON pg.id = pgi.product_group_id
-- WHERE i.id = pgi.inventory_item_id
--   AND i.tenant_id = pgi.tenant_id
--   AND (
--     i.assigned_to_type != pg.assigned_to_type
--     OR i.assigned_to_id != pg.assigned_to_id
--     OR i.assigned_to_type IS NULL
--     OR i.assigned_to_id IS NULL
--   );

-- Step 3: Verify the fix
-- SELECT
--   i.id as item_id,
--   i.item_name,
--   i.assigned_to_type as item_assigned_to_type,
--   i.assigned_to_id as item_assigned_to_id,
--   pg.group_name,
--   pg.assigned_to_type as group_assigned_to_type,
--   pg.assigned_to_id as group_assigned_to_id,
--   CASE
--     WHEN i.assigned_to_type = pg.assigned_to_type AND i.assigned_to_id = pg.assigned_to_id THEN '✓ Consistent'
--     ELSE '✗ Still inconsistent'
--   END as status
-- FROM inventory_items i
-- INNER JOIN product_group_items pgi ON pgi.inventory_item_id = i.id
-- INNER JOIN product_groups pg ON pg.id = pgi.product_group_id;
