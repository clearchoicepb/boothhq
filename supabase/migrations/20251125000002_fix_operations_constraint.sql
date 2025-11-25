-- Fix Operations Constraint
-- Changes strict inequality (>) to non-strict (>=) for timeline fields
-- This allows same-day urgent and missed deadlines for day-of-event tasks

-- Drop the old constraint if it exists
ALTER TABLE IF EXISTS operations_item_types
DROP CONSTRAINT IF EXISTS check_ops_date_order;

-- Add the corrected constraint with >= instead of >
-- This allows urgent_threshold_days = missed_deadline_days (e.g., both 0 for same-day tasks)
ALTER TABLE IF EXISTS operations_item_types
ADD CONSTRAINT check_ops_date_order CHECK (
  due_date_days >= urgent_threshold_days
  AND urgent_threshold_days >= missed_deadline_days
  AND missed_deadline_days >= 0
);

COMMENT ON CONSTRAINT check_ops_date_order ON operations_item_types IS
'Ensures timeline order: due >= urgent >= missed >= 0. Uses >= to allow same-day deadlines.';
