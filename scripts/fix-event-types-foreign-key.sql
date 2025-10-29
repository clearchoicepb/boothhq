-- ============================================================================
-- FIX: Add missing foreign key between event_types and event_categories
-- ============================================================================
-- This fixes the "Could not find a relationship" error on the settings page
-- Run this in your TENANT DB SQL Editor
-- ============================================================================

-- Add foreign key constraint from event_types to event_categories
ALTER TABLE event_types
ADD CONSTRAINT event_types_event_category_id_fkey
FOREIGN KEY (event_category_id)
REFERENCES event_categories(id)
ON DELETE CASCADE;

-- Reload the PostgREST schema cache so the API knows about the new relationship
NOTIFY pgrst, 'reload schema';

-- Verify the foreign key was added
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'event_types'
  AND kcu.column_name = 'event_category_id';

