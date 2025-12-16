-- ============================================================================
-- PHASE 4: Drop legacy task tables
--
-- ⚠️  WARNING: This migration should ONLY be run AFTER confirming:
--    1. All data has been successfully migrated to the unified tasks table
--    2. All UI components have been updated to use the unified model
--    3. All workflows have been tested with the new task creation logic
--    4. There is a verified backup of the production database
--
-- VALIDATION QUERIES (run these before executing this migration):
-- ============================================================================
--
-- Check all design items have corresponding tasks:
--   SELECT COUNT(*) FROM event_design_items edi
--   WHERE NOT EXISTS (
--     SELECT 1 FROM tasks t
--     WHERE t.migrated_from_table = 'event_design_items'
--     AND t.migrated_from_id = edi.id
--   );
--   -- Should return 0
--
-- Check all operations items have corresponding tasks:
--   SELECT COUNT(*) FROM event_operations_items eoi
--   WHERE NOT EXISTS (
--     SELECT 1 FROM tasks t
--     WHERE t.migrated_from_table = 'event_operations_items'
--     AND t.migrated_from_id = eoi.id
--   );
--   -- Should return 0
--
-- Check all design item types have corresponding task templates:
--   SELECT COUNT(*) FROM design_item_types dit
--   WHERE NOT EXISTS (
--     SELECT 1 FROM task_templates tt
--     WHERE tt.migrated_from_table = 'design_item_types'
--     AND tt.migrated_from_id = dit.id
--   );
--   -- Should return 0
--
-- Check all operations item types have corresponding task templates:
--   SELECT COUNT(*) FROM operations_item_types oit
--   WHERE NOT EXISTS (
--     SELECT 1 FROM task_templates tt
--     WHERE tt.migrated_from_table = 'operations_item_types'
--     AND tt.migrated_from_id = oit.id
--   );
--   -- Should return 0
--
-- ============================================================================

-- First, drop foreign key constraints from legacy tables
DO $$
BEGIN
    -- Drop FK from event_design_items to tasks
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'event_design_items_task_id_fkey'
        AND table_name = 'event_design_items'
    ) THEN
        ALTER TABLE event_design_items
            DROP CONSTRAINT event_design_items_task_id_fkey;
    END IF;

    -- Drop FK from event_operations_items to tasks
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'event_operations_items_task_id_fkey'
        AND table_name = 'event_operations_items'
    ) THEN
        ALTER TABLE event_operations_items
            DROP CONSTRAINT event_operations_items_task_id_fkey;
    END IF;

    -- Drop workflow FKs from design items
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_design_items_workflow'
        AND table_name = 'event_design_items'
    ) THEN
        ALTER TABLE event_design_items
            DROP CONSTRAINT fk_event_design_items_workflow;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_design_items_workflow_execution'
        AND table_name = 'event_design_items'
    ) THEN
        ALTER TABLE event_design_items
            DROP CONSTRAINT fk_event_design_items_workflow_execution;
    END IF;
END $$;

-- ============================================================================
-- DROP LEGACY TABLES
-- Uncomment these lines only when ready to permanently remove legacy tables
-- ============================================================================

-- DROP TABLE IF EXISTS event_design_items CASCADE;
-- DROP TABLE IF EXISTS event_operations_items CASCADE;
-- DROP TABLE IF EXISTS design_item_types CASCADE;
-- DROP TABLE IF EXISTS operations_item_types CASCADE;
-- DROP TABLE IF EXISTS design_statuses CASCADE;

-- For now, just add a deprecation comment to the tables
COMMENT ON TABLE event_design_items IS 'DEPRECATED: Replaced by unified tasks table (task_type = design). Data migrated to tasks. Will be dropped in future release.';
COMMENT ON TABLE event_operations_items IS 'DEPRECATED: Replaced by unified tasks table (task_type = operations). Data migrated to tasks. Will be dropped in future release.';
COMMENT ON TABLE design_item_types IS 'DEPRECATED: Replaced by unified task_templates table (task_type = design). Data migrated to task_templates. Will be dropped in future release.';
COMMENT ON TABLE operations_item_types IS 'DEPRECATED: Replaced by unified task_templates table (task_type = operations). Data migrated to task_templates. Will be dropped in future release.';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
