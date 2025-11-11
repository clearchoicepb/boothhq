-- Run this SQL in your Supabase SQL Editor to sync existing product group assignments
-- This will create the missing junction table entries for items like 3P102

INSERT INTO product_group_items (product_group_id, inventory_item_id, tenant_id, date_added)
SELECT
  i.assigned_to_id as product_group_id,
  i.id as inventory_item_id,
  i.tenant_id,
  COALESCE(i.created_at, NOW()) as date_added
FROM inventory_items i
WHERE i.assigned_to_type = 'product_group'
  AND i.assigned_to_id IS NOT NULL
  AND NOT EXISTS (
    -- Only insert if junction entry doesn't already exist
    SELECT 1
    FROM product_group_items pgi
    WHERE pgi.inventory_item_id = i.id
      AND pgi.product_group_id = i.assigned_to_id
      AND pgi.tenant_id = i.tenant_id
  );

-- Check how many items were synced
SELECT COUNT(*) as synced_items_count
FROM product_group_items
WHERE date_added >= NOW() - INTERVAL '5 seconds';
