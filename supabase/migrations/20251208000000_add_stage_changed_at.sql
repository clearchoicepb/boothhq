-- Migration: Add stage_changed_at column to opportunities
-- Purpose: Track when opportunity stage changes for stale lead and auto-close automations

-- Add stage_changed_at column
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing records with updated_at as best approximation
UPDATE opportunities
SET stage_changed_at = COALESCE(updated_at, created_at, NOW())
WHERE stage_changed_at IS NULL;

-- Create trigger function to track stage changes
CREATE OR REPLACE FUNCTION update_stage_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS track_stage_change ON opportunities;

-- Create trigger
CREATE TRIGGER track_stage_change
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_changed_at();

-- Add index for efficient queries on stale lead detection
CREATE INDEX IF NOT EXISTS idx_opportunities_stage_changed_at
ON opportunities(stage_changed_at);

-- Add composite index for efficient queries on auto-close detection
CREATE INDEX IF NOT EXISTS idx_opportunities_stage_event_date
ON opportunities(stage, event_date);
