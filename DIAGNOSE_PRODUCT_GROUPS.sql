-- Diagnostic queries to check product group assignments

-- 1. Check item 3P102 specifically
SELECT
  id,
  item_name,
  assigned_to_type,
  assigned_to_id,
  assignment_type
FROM inventory_items
WHERE item_name LIKE '%3P102%' OR serial_number LIKE '%3P102%';

-- 2. Check all items assigned to product groups
SELECT
  id,
  item_name,
  serial_number,
  assigned_to_type,
  assigned_to_id,
  assignment_type
FROM inventory_items
WHERE assigned_to_type = 'product_group'
ORDER BY item_name;

-- 3. Check what's in the product_group_items junction table
SELECT
  pgi.id,
  pgi.product_group_id,
  pgi.inventory_item_id,
  i.item_name,
  pg.group_name
FROM product_group_items pgi
LEFT JOIN inventory_items i ON i.id = pgi.inventory_item_id
LEFT JOIN product_groups pg ON pg.id = pgi.product_group_id
ORDER BY pg.group_name, i.item_name;

-- 4. Check product groups
SELECT
  id,
  group_name,
  assigned_to_type,
  assigned_to_id
FROM product_groups
ORDER BY group_name;

-- 5. Find items that SHOULD be synced but aren't in junction table
SELECT
  i.id,
  i.item_name,
  i.serial_number,
  i.assigned_to_type,
  i.assigned_to_id,
  pg.group_name as assigned_group
FROM inventory_items i
LEFT JOIN product_groups pg ON pg.id = i.assigned_to_id
WHERE i.assigned_to_type = 'product_group'
  AND i.assigned_to_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM product_group_items pgi
    WHERE pgi.inventory_item_id = i.id
      AND pgi.product_group_id = i.assigned_to_id
  );
