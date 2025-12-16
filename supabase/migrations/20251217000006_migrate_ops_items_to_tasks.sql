-- ============================================================================
-- PHASE 2D: Migrate event_operations_items to tasks table
--
-- Same pattern as design items migration:
-- 1. Updates existing linked tasks with operations-specific fields
-- 2. Creates new tasks for operations items that don't have linked tasks
-- 3. Links the newly created tasks back to operations items
-- ============================================================================

-- First: Update existing linked tasks
UPDATE tasks t
SET
    task_type = 'operations',
    department = 'operations',
    migrated_from_table = 'event_operations_items',
    migrated_from_id = eoi.id
FROM event_operations_items eoi
WHERE eoi.task_id = t.id
AND t.migrated_from_table IS NULL;

-- Second: Create new tasks for ops items without linked tasks
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
WHERE eoi.task_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.migrated_from_table = 'event_operations_items'
    AND t.migrated_from_id = eoi.id
);

-- Third: Update operations items to link to newly created tasks
UPDATE event_operations_items eoi
SET task_id = t.id
FROM tasks t
WHERE t.migrated_from_table = 'event_operations_items'
AND t.migrated_from_id = eoi.id
AND eoi.task_id IS NULL;

-- Log results
DO $$
DECLARE
    updated_count INTEGER;
    linked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM tasks
    WHERE migrated_from_table = 'event_operations_items';

    SELECT COUNT(*) INTO linked_count
    FROM event_operations_items
    WHERE task_id IS NOT NULL;

    RAISE NOTICE 'Operations items migration: % tasks updated/created, % ops items now linked', updated_count, linked_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
