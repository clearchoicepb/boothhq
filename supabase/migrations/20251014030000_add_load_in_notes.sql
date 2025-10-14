-- Add load_in_notes field to events table for operations personnel notes
-- This is for notes like "see security", "call POC upon arrival", etc.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS load_in_notes TEXT;

COMMENT ON COLUMN events.load_in_notes IS 'Operations notes for load-in (e.g., see security, call POC upon arrival, parking instructions)';

-- Remove the event_setup_time field we just added (not needed)
ALTER TABLE events
  DROP COLUMN IF EXISTS event_setup_time;
