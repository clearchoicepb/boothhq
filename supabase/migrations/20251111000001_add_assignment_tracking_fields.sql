-- Add assignment tracking fields to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS assignment_type TEXT CHECK (assignment_type IN ('long_term_staff', 'event_checkout', 'warehouse', NULL)),
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_return_date DATE;

-- Add index for event lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_event
  ON inventory_items(tenant_id, event_id)
  WHERE event_id IS NOT NULL;

-- Add index for return date lookups (for finding items due back)
CREATE INDEX IF NOT EXISTS idx_inventory_items_return_date
  ON inventory_items(tenant_id, expected_return_date)
  WHERE expected_return_date IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN inventory_items.assignment_type IS 'Type of assignment: long_term_staff (months), event_checkout (weekend), warehouse (storage), or null (unassigned)';
COMMENT ON COLUMN inventory_items.event_id IS 'Optional link to event for event_checkout assignments';
COMMENT ON COLUMN inventory_items.expected_return_date IS 'Expected return date for event_checkout assignments';

-- Create function to log assignment changes
CREATE OR REPLACE FUNCTION log_inventory_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_from_name TEXT;
  v_to_name TEXT;
  v_changed_by UUID;
BEGIN
  -- Skip if this is the initial insert and nothing is assigned
  IF (TG_OP = 'INSERT' AND NEW.assigned_to_id IS NULL) THEN
    RETURN NEW;
  END IF;

  -- Get the user ID from the current session (if available)
  BEGIN
    v_changed_by := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_changed_by := NULL;
  END;

  -- Resolve "from" name
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to_id IS NOT NULL) THEN
    IF OLD.assigned_to_type = 'user' THEN
      SELECT CONCAT(first_name, ' ', last_name) INTO v_from_name
      FROM users WHERE id = OLD.assigned_to_id;
    ELSIF OLD.assigned_to_type = 'physical_address' THEN
      SELECT location_name INTO v_from_name
      FROM physical_addresses WHERE id = OLD.assigned_to_id;
    ELSIF OLD.assigned_to_type = 'product_group' THEN
      SELECT group_name INTO v_from_name
      FROM product_groups WHERE id = OLD.assigned_to_id;
    ELSE
      v_from_name := 'Unassigned';
    END IF;
  END IF;

  -- Resolve "to" name
  IF NEW.assigned_to_id IS NOT NULL THEN
    IF NEW.assigned_to_type = 'user' THEN
      SELECT CONCAT(first_name, ' ', last_name) INTO v_to_name
      FROM users WHERE id = NEW.assigned_to_id;
    ELSIF NEW.assigned_to_type = 'physical_address' THEN
      SELECT location_name INTO v_to_name
      FROM physical_addresses WHERE id = NEW.assigned_to_id;
    ELSIF NEW.assigned_to_type = 'product_group' THEN
      SELECT group_name INTO v_to_name
      FROM product_groups WHERE id = NEW.assigned_to_id;
    ELSE
      v_to_name := 'Unassigned';
    END IF;
  ELSE
    v_to_name := 'Unassigned';
  END IF;

  -- Log the change if assignment actually changed
  IF (TG_OP = 'INSERT') OR
     (TG_OP = 'UPDATE' AND (
       OLD.assigned_to_type IS DISTINCT FROM NEW.assigned_to_type OR
       OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id
     )) THEN

    INSERT INTO inventory_assignment_history (
      tenant_id,
      inventory_item_id,
      assigned_from_type,
      assigned_from_id,
      assigned_from_name,
      assigned_to_type,
      assigned_to_id,
      assigned_to_name,
      assignment_type,
      event_id,
      expected_return_date,
      changed_by,
      changed_at
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.assigned_to_type ELSE NULL END,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.assigned_to_id ELSE NULL END,
      v_from_name,
      NEW.assigned_to_type,
      NEW.assigned_to_id,
      v_to_name,
      NEW.assignment_type,
      NEW.event_id,
      NEW.expected_return_date,
      v_changed_by,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log assignment changes
DROP TRIGGER IF EXISTS trigger_log_inventory_assignment_change ON inventory_items;
CREATE TRIGGER trigger_log_inventory_assignment_change
  AFTER INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_assignment_change();

COMMENT ON FUNCTION log_inventory_assignment_change() IS 'Automatically logs inventory assignment changes to history table';
