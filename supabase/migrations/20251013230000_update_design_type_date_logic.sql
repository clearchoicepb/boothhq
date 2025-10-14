-- Update design_item_types to use event-based date logic
-- Replace complex timeline fields with simpler event-date-based approach

-- ============================================================================
-- STEP 1: Add new columns
-- ============================================================================

ALTER TABLE design_item_types
  ADD COLUMN IF NOT EXISTS due_date_days INTEGER DEFAULT 21,
  ADD COLUMN IF NOT EXISTS missed_deadline_days INTEGER DEFAULT 13;

COMMENT ON COLUMN design_item_types.due_date_days IS 'Days before event when design must be completed (e.g., 21 days before)';
COMMENT ON COLUMN design_item_types.urgent_threshold_days IS 'Days before event when missed due date becomes urgent (e.g., 14 days before)';
COMMENT ON COLUMN design_item_types.missed_deadline_days IS 'Days before event when it is too late to offer (e.g., 13 days before)';

-- ============================================================================
-- STEP 2: Update ALL existing records to have valid date configurations
-- ============================================================================

-- Update ALL rows to ensure they meet the constraint requirements
-- This ensures: due_date_days > urgent_threshold_days > missed_deadline_days
UPDATE design_item_types SET
  due_date_days = CASE
    WHEN type = 'physical' THEN 21  -- Physical items need more lead time
    ELSE 14  -- Digital items can be faster
  END,
  urgent_threshold_days = CASE
    WHEN type = 'physical' THEN 14
    ELSE 7
  END,
  missed_deadline_days = CASE
    WHEN type = 'physical' THEN 13
    ELSE 3
  END;

-- ============================================================================
-- STEP 3: Add constraint to ensure proper date ordering
-- ============================================================================

ALTER TABLE design_item_types
  DROP CONSTRAINT IF EXISTS check_design_date_order;

ALTER TABLE design_item_types
  ADD CONSTRAINT check_design_date_order
  CHECK (
    due_date_days > urgent_threshold_days
    AND urgent_threshold_days > missed_deadline_days
    AND missed_deadline_days > 0
  );

-- ============================================================================
-- STEP 4: Remove old unused columns
-- ============================================================================

ALTER TABLE design_item_types
  DROP COLUMN IF EXISTS default_design_days,
  DROP COLUMN IF EXISTS default_production_days,
  DROP COLUMN IF EXISTS default_shipping_days,
  DROP COLUMN IF EXISTS client_approval_buffer_days,
  DROP COLUMN IF EXISTS estimated_hours;

-- ============================================================================
-- STEP 5: Update event_design_items - remove old timeline columns
-- ============================================================================

ALTER TABLE event_design_items
  DROP COLUMN IF EXISTS design_start_date,
  DROP COLUMN IF EXISTS custom_design_days;

-- Note: design_deadline column is kept - it will be calculated from event date + settings

COMMENT ON COLUMN event_design_items.design_deadline IS 'Design deadline calculated from event date minus due_date_days from design type';

-- ============================================================================
-- STEP 6: Create helper function to calculate design deadline
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_design_deadline(
  p_event_date DATE,
  p_due_date_days INTEGER
)
RETURNS DATE AS $$
BEGIN
  RETURN p_event_date - p_due_date_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_design_deadline IS 'Calculate design deadline based on event date and due date days';

-- ============================================================================
-- EXAMPLE USAGE:
-- Backdrop: due_date_days=21, urgent_threshold_days=14, missed_deadline_days=13
-- Event Date: 2025-01-31
--
-- Timeline:
-- - Due Date: 2025-01-10 (31-21=10) - Must be done by this date
-- - Urgent starts: 2025-01-17 (31-14=17) - Missed due date, becoming urgent
-- - Missed Deadline: 2025-01-18 (31-13=18) - Too late, cannot offer
--
-- Status Logic:
-- - Days until event >= 21: On Time / Pending
-- - Days until event 14-20: Urgent (missed due date, still possible)
-- - Days until event 13 or less: Missed Deadline (too late)
-- ============================================================================
