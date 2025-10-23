-- Fix notes table to support opportunity and event entity types
-- Issue: NotesSection component tries to save notes for opportunities and events
-- but the CHECK constraint only allowed 'lead', 'account', 'contact'

-- Drop the old constraint
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;

-- Add new constraint with all entity types
ALTER TABLE notes 
ADD CONSTRAINT notes_entity_type_check 
CHECK (entity_type IN ('lead', 'account', 'contact', 'opportunity', 'event', 'invoice'));

