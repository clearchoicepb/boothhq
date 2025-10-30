-- Fix design_item_types schema to match production data
-- This migration ensures all required fields exist for the Settings page

-- ============================================================================
-- STEP 1: Ensure all required columns exist
-- ============================================================================

-- Add 'type' column if it doesn't exist (digital/physical)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_item_types' AND column_name = 'type'
  ) THEN
    ALTER TABLE design_item_types
      ADD COLUMN type VARCHAR(20) CHECK (type IN ('digital', 'physical')) DEFAULT 'digital';

    -- Update existing records based on category
    UPDATE design_item_types SET
      type = CASE
        WHEN category IN ('print', 'environmental', 'promotional') THEN 'physical'
        ELSE 'digital'
      END;
  END IF;
END $$;

-- Add 'urgent_threshold_days' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_item_types' AND column_name = 'urgent_threshold_days'
  ) THEN
    ALTER TABLE design_item_types
      ADD COLUMN urgent_threshold_days INTEGER DEFAULT 7;
  END IF;
END $$;

-- Add 'is_auto_added' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_item_types' AND column_name = 'is_auto_added'
  ) THEN
    ALTER TABLE design_item_types
      ADD COLUMN is_auto_added BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add 'due_date_days' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_item_types' AND column_name = 'due_date_days'
  ) THEN
    ALTER TABLE design_item_types
      ADD COLUMN due_date_days INTEGER DEFAULT 21;
  END IF;
END $$;

-- Add 'missed_deadline_days' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_item_types' AND column_name = 'missed_deadline_days'
  ) THEN
    ALTER TABLE design_item_types
      ADD COLUMN missed_deadline_days INTEGER DEFAULT 1;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add comments to document the fields
-- ============================================================================

COMMENT ON COLUMN design_item_types.type IS 'Item type: digital (files only) or physical (requires production/shipping)';
COMMENT ON COLUMN design_item_types.urgent_threshold_days IS 'Days before event when item becomes urgent';
COMMENT ON COLUMN design_item_types.is_auto_added IS 'Automatically add this type to every new event';
COMMENT ON COLUMN design_item_types.due_date_days IS 'Days before event when design must be completed';
COMMENT ON COLUMN design_item_types.missed_deadline_days IS 'Days before event when it is too late to complete';

-- ============================================================================
-- STEP 3: Ensure constraint exists for proper date ordering
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE design_item_types
  DROP CONSTRAINT IF EXISTS check_design_date_order;

-- Add constraint to ensure: due_date_days > urgent_threshold_days > missed_deadline_days
ALTER TABLE design_item_types
  ADD CONSTRAINT check_design_date_order
  CHECK (
    due_date_days > urgent_threshold_days
    AND urgent_threshold_days >= missed_deadline_days
    AND missed_deadline_days > 0
  );

-- ============================================================================
-- STEP 4: Update any NULL values to have sensible defaults
-- ============================================================================

UPDATE design_item_types
SET
  type = COALESCE(type,
    CASE
      WHEN category IN ('print', 'environmental', 'promotional') THEN 'physical'
      ELSE 'digital'
    END
  ),
  due_date_days = COALESCE(due_date_days,
    CASE
      WHEN type = 'physical' OR category IN ('print', 'environmental', 'promotional') THEN 21
      ELSE 14
    END
  ),
  urgent_threshold_days = COALESCE(urgent_threshold_days,
    CASE
      WHEN type = 'physical' OR category IN ('print', 'environmental', 'promotional') THEN 10
      ELSE 7
    END
  ),
  missed_deadline_days = COALESCE(missed_deadline_days,
    CASE
      WHEN type = 'physical' OR category IN ('print', 'environmental', 'promotional') THEN 12
      ELSE 1
    END
  ),
  is_auto_added = COALESCE(is_auto_added, false);

-- ============================================================================
-- Verification Query (commented out - uncomment to test)
-- ============================================================================
-- SELECT
--   name,
--   type,
--   due_date_days,
--   urgent_threshold_days,
--   missed_deadline_days,
--   is_auto_added,
--   is_active
-- FROM design_item_types
-- ORDER BY display_order;
