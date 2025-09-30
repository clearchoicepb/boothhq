-- Update contacts table schema to replace job_title and department with relationship_to_account

-- Add the new relationship_to_account column
ALTER TABLE contacts ADD COLUMN relationship_to_account VARCHAR(50);

-- Update existing records to have 'Unknown' as default relationship
UPDATE contacts SET relationship_to_account = 'Unknown' WHERE relationship_to_account IS NULL;

-- Remove the old columns
ALTER TABLE contacts DROP COLUMN IF EXISTS job_title;
ALTER TABLE contacts DROP COLUMN IF EXISTS department;

-- Add a check constraint to ensure valid relationship values
ALTER TABLE contacts ADD CONSTRAINT check_relationship_to_account 
CHECK (relationship_to_account IN (
  'Consultant',
  'Designer', 
  'Event Planner - Internal',
  'Event Planner - External',
  'Other - Internal',
  'Other - External',
  'Unknown'
) OR relationship_to_account IS NULL);

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_relationship ON contacts(relationship_to_account);
