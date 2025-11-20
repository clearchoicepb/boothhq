-- Add 'project' to entity_type constraints for attachments and notes tables
-- This allows projects to have attachments and notes

-- Update attachments table constraint
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_entity_type_check;
ALTER TABLE attachments 
ADD CONSTRAINT attachments_entity_type_check 
CHECK (entity_type IN ('opportunity', 'account', 'contact', 'lead', 'invoice', 'event', 'project'));

-- Update notes table constraint
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE notes 
ADD CONSTRAINT notes_entity_type_check 
CHECK (entity_type IN ('lead', 'account', 'contact', 'opportunity', 'event', 'invoice', 'project'));

-- Add comment for documentation
COMMENT ON CONSTRAINT attachments_entity_type_check ON attachments IS 'Allowed entity types for attachments';
COMMENT ON CONSTRAINT notes_entity_type_check ON notes IS 'Allowed entity types for notes';

