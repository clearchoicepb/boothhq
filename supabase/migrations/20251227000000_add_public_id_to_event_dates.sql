-- ============================================
-- Add public_id to event_dates for public logistics links
-- Follows pattern from event_forms migration
-- ============================================

-- Add public_id column to event_dates
ALTER TABLE event_dates ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Create index for fast public_id lookups
CREATE INDEX IF NOT EXISTS idx_event_dates_public_id ON event_dates(public_id);

-- ===========================================
-- PUBLIC ACCESS POLICY
-- Allow public logistics viewing via public_id
-- ===========================================

-- Policy to allow anyone to view event_dates by public_id (for public logistics page)
-- Note: Using service role key in API, so RLS is bypassed, but this is for documentation
CREATE POLICY "Anyone can view event_dates by public_id"
  ON event_dates FOR SELECT
  USING (public_id IS NOT NULL AND public_id != '');

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON COLUMN event_dates.public_id IS 'Short URL-safe ID for public logistics link (base64url, 11 chars)';
