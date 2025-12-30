-- Add staff brief fields to events table for staff-facing event brief page
-- This creates a separate token from the client-facing public_token

ALTER TABLE events
  -- Staff brief access
  ADD COLUMN IF NOT EXISTS staff_brief_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS staff_brief_enabled BOOLEAN DEFAULT true,

  -- Dress code field for staff instructions
  ADD COLUMN IF NOT EXISTS dress_code TEXT;

-- Create index for staff_brief_token lookups
CREATE INDEX IF NOT EXISTS idx_events_staff_brief_token ON events(staff_brief_token);

-- Add comments
COMMENT ON COLUMN events.staff_brief_token IS 'Unique token for staff to access event brief page without authentication';
COMMENT ON COLUMN events.staff_brief_enabled IS 'Whether staff brief page is enabled for this event';
COMMENT ON COLUMN events.dress_code IS 'Dress code instructions for staff at this event';

-- Create function to generate staff brief token when events are created
CREATE OR REPLACE FUNCTION generate_staff_brief_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if token is null and event is being inserted
  IF NEW.staff_brief_token IS NULL THEN
    NEW.staff_brief_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (to allow re-running migration)
DROP TRIGGER IF EXISTS trigger_generate_staff_brief_token ON events;

-- Create trigger to auto-generate staff brief token on insert
CREATE TRIGGER trigger_generate_staff_brief_token
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_brief_token();

-- Backfill existing events with staff brief tokens
UPDATE events
SET staff_brief_token = encode(gen_random_bytes(32), 'hex')
WHERE staff_brief_token IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
