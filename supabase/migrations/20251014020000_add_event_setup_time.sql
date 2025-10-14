-- Add event_setup_time field to events table
-- This represents when the event setup actually starts (between load-in and setup complete)

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_setup_time TIME;

COMMENT ON COLUMN events.event_setup_time IS 'Time when event setup begins (after load-in, before setup_time which is when setup must be complete)';
