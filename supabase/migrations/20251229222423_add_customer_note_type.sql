-- Add 'customer_note' to communication_type options
-- This allows clients to leave notes on their public event page

-- Check if there's an existing constraint and drop it if exists
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'communications_communication_type_check'
  ) THEN
    ALTER TABLE communications DROP CONSTRAINT communications_communication_type_check;
  END IF;
END $$;

-- Add updated constraint with customer_note included
-- Note: If no constraint existed before, this adds one for data integrity
ALTER TABLE communications
ADD CONSTRAINT communications_communication_type_check
CHECK (communication_type IN ('email', 'sms', 'phone', 'in_person', 'other', 'customer_note'));

-- Grant permissions for service role (needed for public submissions)
GRANT ALL ON communications TO authenticated;
GRANT ALL ON communications TO service_role;

-- Add comment for the new type
COMMENT ON COLUMN communications.communication_type IS 'Type: email, sms, phone, in_person, other, customer_note';
