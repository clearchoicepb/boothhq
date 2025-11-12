-- Add setup_time field to event_dates table
-- This allows each event date to have its own setup time

ALTER TABLE event_dates
  ADD COLUMN IF NOT EXISTS setup_time TIME;

COMMENT ON COLUMN event_dates.setup_time IS 'Time when setup begins for this specific event date';
