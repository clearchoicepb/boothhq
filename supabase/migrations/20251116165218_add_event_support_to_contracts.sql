-- Add event_id to contracts table to support event-specific agreements
-- This allows contracts to be associated with events in addition to opportunities, accounts, contacts, and leads

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contracts_event_id ON contracts(event_id);

-- Add comment for documentation
COMMENT ON COLUMN contracts.event_id IS 'Foreign key to events table for event-specific agreements and contracts';
