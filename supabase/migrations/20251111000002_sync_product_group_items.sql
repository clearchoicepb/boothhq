-- Migration to sync existing inventory items with product_group_items junction table
-- This fixes items that were assigned to product groups via the form before the junction table was properly maintained

-- Insert missing junction table entries for items assigned to product groups
INSERT INTO product_group_items (product_group_id, inventory_item_id, tenant_id, date_added)
SELECT
  i.assigned_to_id as product_group_id,
  i.id as inventory_item_id,
  i.tenant_id,
  i.created_at as date_added
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

-- Add comment
COMMENT ON TABLE product_group_items IS 'Junction table linking inventory items to product groups. Synced with inventory_items.assigned_to_type via triggers and API.';
