-- Add event_id column to communications table
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Add index for event_id
CREATE INDEX IF NOT EXISTS idx_communications_event_id ON communications(event_id);

-- Add comment
COMMENT ON COLUMN communications.event_id IS 'Reference to the event this communication is related to';
