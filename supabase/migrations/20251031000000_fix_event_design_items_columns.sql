-- Fix event_design_items table to ensure required columns exist
-- This migration ensures design_deadline and other columns exist

-- ============================================================================
-- STEP 1: Add missing columns to event_design_items
-- ============================================================================

-- Add 'design_deadline' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_design_items' AND column_name = 'design_deadline'
  ) THEN
    ALTER TABLE event_design_items
      ADD COLUMN design_deadline DATE;

    -- Set initial value from due_date if it exists
    UPDATE event_design_items
    SET design_deadline = due_date
    WHERE due_date IS NOT NULL AND design_deadline IS NULL;
  END IF;
END $$;

-- Add 'design_start_date' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_design_items' AND column_name = 'design_start_date'
  ) THEN
    ALTER TABLE event_design_items
      ADD COLUMN design_start_date DATE;
  END IF;
END $$;

-- Add 'custom_design_days' column if it doesn't exist (needed for helper functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_design_items' AND column_name = 'custom_design_days'
  ) THEN
    ALTER TABLE event_design_items
      ADD COLUMN custom_design_days INTEGER;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add comments to document the fields
-- ============================================================================

COMMENT ON COLUMN event_design_items.design_deadline IS 'Deadline for design completion (calculated from event date minus due_date_days)';
COMMENT ON COLUMN event_design_items.design_start_date IS 'Start date for design work';
COMMENT ON COLUMN event_design_items.custom_design_days IS 'Custom override for design days (if different from template)';

-- ============================================================================
-- STEP 3: Sync design_deadline with due_date where needed
-- ============================================================================

-- For existing records, ensure design_deadline is populated
UPDATE event_design_items
SET design_deadline = COALESCE(design_deadline, due_date)
WHERE design_deadline IS NULL AND due_date IS NOT NULL;

-- For existing records, ensure due_date is populated
UPDATE event_design_items
SET due_date = COALESCE(due_date, design_deadline)
WHERE due_date IS NULL AND design_deadline IS NOT NULL;
