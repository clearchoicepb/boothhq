-- ============================================
-- Add public_token and public_page_enabled to events
-- Enables public client-facing event page access
-- ============================================

-- Add public_token column to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS public_token VARCHAR(64) UNIQUE;

-- Add public_page_enabled column to events (defaults to true)
ALTER TABLE events ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN DEFAULT true;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_events_public_token ON events(public_token);

-- Function to generate a secure random token for events
CREATE OR REPLACE FUNCTION generate_event_token()
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate token for new events
CREATE OR REPLACE FUNCTION set_event_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := generate_event_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid duplicate errors
DROP TRIGGER IF EXISTS trigger_set_event_token ON events;

CREATE TRIGGER trigger_set_event_token
BEFORE INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION set_event_token();

-- Backfill tokens for existing events
UPDATE events
SET public_token = generate_event_token()
WHERE public_token IS NULL;

-- ===========================================
-- PUBLIC ACCESS POLICY
-- Allow public event viewing via public_token
-- ===========================================

-- Policy to allow anyone to view events by public_token (for public event page)
-- Note: Using service role key in API, so RLS is typically bypassed
DROP POLICY IF EXISTS "Anyone can view events by public_token" ON events;
CREATE POLICY "Anyone can view events by public_token"
  ON events FOR SELECT
  USING (public_token IS NOT NULL AND public_page_enabled = true);

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON COLUMN events.public_token IS 'Secure 64-character hex token for public event page access';
COMMENT ON COLUMN events.public_page_enabled IS 'Toggle to enable/disable public event page access';
