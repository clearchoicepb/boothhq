-- Remove 'product_group' from inventory_items.assigned_to_type constraint
-- Items should only be assigned to 'user' or 'physical_address'
-- Product groups are managed through the product_group_items junction table
-- Items inherit their group's assignment automatically via triggers

-- Step 1: Fix any items currently assigned as 'product_group'
-- These should inherit from their actual product group or be set to NULL
UPDATE inventory_items i
SET
  assigned_to_type = COALESCE(pg.assigned_to_type, NULL),
  assigned_to_id = COALESCE(pg.assigned_to_id, NULL),
  updated_at = NOW()
FROM product_group_items pgi
LEFT JOIN product_groups pg ON pg.id = pgi.product_group_id
WHERE i.id = pgi.inventory_item_id
  AND i.tenant_id = pgi.tenant_id
  AND i.assigned_to_type = 'product_group';

-- Step 2: Drop the old constraint
ALTER TABLE inventory_items
DROP CONSTRAINT IF EXISTS inventory_items_assigned_to_type_check;

-- Step 3: Add new constraint without 'product_group'
ALTER TABLE inventory_items
ADD CONSTRAINT inventory_items_assigned_to_type_check
CHECK (assigned_to_type IN ('user', 'physical_address'));

-- Update comment to reflect the change
COMMENT ON COLUMN inventory_items.assigned_to_type IS 'Type of assignment: user or physical_address (product groups managed separately via junction table)';
