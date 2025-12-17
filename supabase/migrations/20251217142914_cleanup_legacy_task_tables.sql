-- ============================================================================
-- CLEANUP: Remove deprecated task-related tables
-- Only run after verifying unified task system is working
-- ============================================================================

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_task_id_fkey;
ALTER TABLE IF EXISTS event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_event_id_fkey;
ALTER TABLE IF EXISTS event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_design_item_type_id_fkey;
ALTER TABLE IF EXISTS event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_assigned_designer_id_fkey;
ALTER TABLE IF EXISTS event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_approved_by_fkey;

ALTER TABLE IF EXISTS event_operations_items
  DROP CONSTRAINT IF EXISTS event_operations_items_task_id_fkey;
ALTER TABLE IF EXISTS event_operations_items
  DROP CONSTRAINT IF EXISTS event_operations_items_event_id_fkey;
ALTER TABLE IF EXISTS event_operations_items
  DROP CONSTRAINT IF EXISTS event_operations_items_operations_item_type_id_fkey;
ALTER TABLE IF EXISTS event_operations_items
  DROP CONSTRAINT IF EXISTS event_operations_items_assigned_to_id_fkey;

-- Drop workflow_actions constraints referencing old type tables
ALTER TABLE IF EXISTS workflow_actions
  DROP CONSTRAINT IF EXISTS workflow_actions_design_item_type_id_fkey;
ALTER TABLE IF EXISTS workflow_actions
  DROP CONSTRAINT IF EXISTS workflow_actions_operations_item_type_id_fkey;

-- Remove columns from workflow_actions that reference old tables
-- NOTE: Keeping the columns for now since they may contain historical data
-- that can be used to look up migrated templates via migrated_from_id
-- ALTER TABLE IF EXISTS workflow_actions
--   DROP COLUMN IF EXISTS design_item_type_id;
-- ALTER TABLE IF EXISTS workflow_actions
--   DROP COLUMN IF EXISTS operations_item_type_id;

-- Drop the deprecated tables
DROP TABLE IF EXISTS event_design_items CASCADE;
DROP TABLE IF EXISTS event_operations_items CASCADE;
DROP TABLE IF EXISTS design_item_types CASCADE;
DROP TABLE IF EXISTS operations_item_types CASCADE;
DROP TABLE IF EXISTS design_statuses CASCADE;

-- Clean up any orphaned RLS policies (will error silently if not exist)
-- These DROP POLICY statements will fail silently if the table doesn't exist
-- or if the policy doesn't exist

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Legacy task tables cleanup complete';
  RAISE NOTICE 'Dropped tables: event_design_items, event_operations_items, design_item_types, operations_item_types, design_statuses';
  RAISE NOTICE 'All task data is now in the unified tasks table';
END $$;
