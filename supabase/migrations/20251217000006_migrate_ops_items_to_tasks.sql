-- ============================================================================
-- PHASE 2D: Migrate event_operations_items to tasks table
--
-- This migration:
-- 1. Creates unified tasks for ALL operations items
-- 2. Links the newly created tasks back to operations items (if task_id column exists)
--
-- Note: This migration handles the case where task_id column may not exist
-- ============================================================================

-- Create tasks for ALL operations items that don't have a migrated task yet
INSERT INTO tasks (
    id,
    tenant_id,
    title,
    description,
    status,
    priority,
    assigned_to,
    created_by,
    entity_type,
    entity_id,
    due_date,
    completed_at,
    department,
    task_type,
    assigned_at,
    started_at,
    auto_created,
    workflow_id,
    workflow_execution_id,
    migrated_from_table,
    migrated_from_id,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    eoi.tenant_id,
    eoi.item_name,
    eoi.description,
    eoi.status,
    CASE
        WHEN eoi.due_date IS NOT NULL AND eoi.due_date < CURRENT_DATE THEN 'urgent'
        WHEN eoi.due_date IS NOT NULL AND eoi.due_date < CURRENT_DATE + 3 THEN 'high'
        ELSE 'medium'
    END,  -- priority based on deadline
    eoi.assigned_to_id,
    eoi.created_by,
    'event',
    eoi.event_id,
    eoi.due_date,
    eoi.completed_at,
    'operations',
    'operations',
    eoi.assigned_at,
    eoi.started_at,
    eoi.auto_created,
    eoi.workflow_id,
    eoi.workflow_execution_id,
    'event_operations_items',
    eoi.id,
    eoi.created_at,
    eoi.updated_at
FROM event_operations_items eoi
WHERE NOT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.migrated_from_table = 'event_operations_items'
    AND t.migrated_from_id = eoi.id
);

-- Add task_id column to event_operations_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_operations_items' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE event_operations_items
            ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_event_operations_items_task
            ON event_operations_items(task_id);

        COMMENT ON COLUMN event_operations_items.task_id IS 'Linked task in the unified tasks system';
    END IF;
END $$;

-- Link operations items to their newly created tasks
UPDATE event_operations_items eoi
SET task_id = t.id
FROM tasks t
WHERE t.migrated_from_table = 'event_operations_items'
AND t.migrated_from_id = eoi.id
AND eoi.task_id IS NULL;

-- Log results
DO $$
DECLARE
    migrated_count INTEGER;
    linked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM tasks
    WHERE migrated_from_table = 'event_operations_items';

    SELECT COUNT(*) INTO linked_count
    FROM event_operations_items
    WHERE task_id IS NOT NULL;

    RAISE NOTICE 'Operations items migration: % tasks created, % ops items now linked', migrated_count, linked_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
