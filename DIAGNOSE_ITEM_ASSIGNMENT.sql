-- Diagnostic queries for troubleshooting item 3P102 assignment to product group

-- 1. Check current state of item 3P102 (or the specific item ID)
SELECT
  id,
  item_name,
  serial_number,
  assigned_to_type,
  assigned_to_id,
  assignment_type,
  tenant_id,
  created_at,
  updated_at
FROM inventory_items
WHERE id = 'dd583bf0-2f8d-4afc-95dc-626c4db01db4'
   OR item_name LIKE '%3P102%'
   OR serial_number LIKE '%3P102%';

-- 2. Check if this item already has a junction table entry
SELECT
  pgi.id as junction_id,
  pgi.product_group_id,
  pgi.inventory_item_id,
  pgi.tenant_id,
  pgi.date_added,
  pg.group_name,
  i.item_name
FROM product_group_items pgi
LEFT JOIN product_groups pg ON pg.id = pgi.product_group_id
LEFT JOIN inventory_items i ON i.id = pgi.inventory_item_id
WHERE pgi.inventory_item_id = 'dd583bf0-2f8d-4afc-95dc-626c4db01db4';

-- 3. Check all product groups to see which one you're trying to assign to
SELECT
  id,
  group_name,
  assigned_to_type,
  assigned_to_id,
  tenant_id
FROM product_groups
ORDER BY group_name;

-- 4. Check for any duplicate junction entries that might cause unique constraint violations
SELECT
  product_group_id,
  inventory_item_id,
  COUNT(*) as duplicate_count
FROM product_group_items
WHERE inventory_item_id = 'dd583bf0-2f8d-4afc-95dc-626c4db01db4'
GROUP BY product_group_id, inventory_item_id
HAVING COUNT(*) > 1;

-- 5. Verify tenant_id consistency
SELECT
  'inventory_item' as source,
  tenant_id
FROM inventory_items
WHERE id = 'dd583bf0-2f8d-4afc-95dc-626c4db01db4'
UNION ALL
SELECT
  'product_group' as source,
  tenant_id
FROM product_groups
LIMIT 5;
