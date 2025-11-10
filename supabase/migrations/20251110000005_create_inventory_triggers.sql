-- Create trigger function to cascade product group assignment to items
-- When a product group's assignment changes, update all items in that group
CREATE OR REPLACE FUNCTION cascade_product_group_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When product group assignment changes, update all inventory items in that group
  IF (TG_OP = 'UPDATE' AND (OLD.assigned_to_type != NEW.assigned_to_type OR OLD.assigned_to_id != NEW.assigned_to_id)) THEN
    UPDATE inventory_items
    SET
      assigned_to_type = NEW.assigned_to_type,
      assigned_to_id = NEW.assigned_to_id,
      updated_at = NOW()
    WHERE id IN (
      SELECT inventory_item_id
      FROM product_group_items
      WHERE product_group_id = NEW.id
        AND tenant_id = NEW.tenant_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to product_groups table
CREATE TRIGGER product_group_assignment_cascade
  AFTER UPDATE ON product_groups
  FOR EACH ROW
  EXECUTE FUNCTION cascade_product_group_assignment();

-- Create trigger function to auto-assign items added to product group
-- When an item is added to a group, inherit the group's assignment
CREATE OR REPLACE FUNCTION auto_assign_item_to_group()
RETURNS TRIGGER AS $$
DECLARE
  group_assignment_type VARCHAR(50);
  group_assignment_id UUID;
BEGIN
  -- Get the product group's current assignment
  SELECT assigned_to_type, assigned_to_id
  INTO group_assignment_type, group_assignment_id
  FROM product_groups
  WHERE id = NEW.product_group_id
    AND tenant_id = NEW.tenant_id;

  -- Update the inventory item to inherit the group's assignment
  IF group_assignment_type IS NOT NULL AND group_assignment_id IS NOT NULL THEN
    UPDATE inventory_items
    SET
      assigned_to_type = group_assignment_type,
      assigned_to_id = group_assignment_id,
      updated_at = NOW()
    WHERE id = NEW.inventory_item_id
      AND tenant_id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to product_group_items table
CREATE TRIGGER auto_assign_on_group_add
  AFTER INSERT ON product_group_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_item_to_group();

-- Add comments
COMMENT ON FUNCTION cascade_product_group_assignment IS 'Cascades product group assignment changes to all items in the group';
COMMENT ON FUNCTION auto_assign_item_to_group IS 'Automatically assigns items to inherit their product groups assignment';
