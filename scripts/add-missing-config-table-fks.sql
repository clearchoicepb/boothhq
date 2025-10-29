-- ============================================================================
-- ADD MISSING FOREIGN KEYS TO CONFIG TABLES
-- ============================================================================
-- These FKs ensure referential integrity for created_by audit columns
-- All use ON DELETE SET NULL since created_by is optional/nullable
-- Run this in your TENANT DB SQL Editor
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

-- Add FK: design_statuses.created_by → users.id
ALTER TABLE design_statuses
ADD CONSTRAINT design_statuses_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL;

-- Add FK: core_task_templates.created_by → users.id
ALTER TABLE core_task_templates
ADD CONSTRAINT core_task_templates_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL;

-- Add FK: packages.created_by → users.id
ALTER TABLE packages
ADD CONSTRAINT packages_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL;

-- Add FK: add_ons.created_by → users.id
ALTER TABLE add_ons
ADD CONSTRAINT add_ons_created_by_fkey
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
  AND tc.table_name IN (
    'event_types',
    'event_categories', 
    'design_statuses',
    'core_task_templates',
    'packages',
    'add_ons'
  )
  AND kcu.column_name = 'created_by'
ORDER BY tc.table_name;

