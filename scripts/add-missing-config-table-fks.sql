-- ============================================================================
-- ADD MISSING FOREIGN KEYS TO CONFIG TABLES
-- ============================================================================
-- These FKs ensure referential integrity for created_by audit columns
-- All use ON DELETE SET NULL since created_by is optional/nullable
-- Run this in your TENANT DB SQL Editor
-- ============================================================================
-- NOTE: Only event_types and event_categories have created_by columns
-- The other tables (design_statuses, core_task_templates, packages, add_ons)
-- do not have created_by columns and thus don't need these FKs
-- ============================================================================

-- Add FK: event_types.created_by → users.id
ALTER TABLE event_types
ADD CONSTRAINT event_types_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL;

-- Add FK: event_categories.created_by → users.id
ALTER TABLE event_categories
ADD CONSTRAINT event_categories_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL;

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify all foreign keys were added successfully
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('event_types', 'event_categories')
  AND kcu.column_name = 'created_by'
ORDER BY tc.table_name;

