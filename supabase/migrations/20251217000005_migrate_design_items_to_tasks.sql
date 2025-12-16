-- ============================================================================
-- PHASE 2C: Migrate event_design_items to tasks table
--
-- This migration:
-- 1. Creates unified tasks for ALL design items
-- 2. Links the newly created tasks back to design items (if task_id column exists)
--
-- Note: This migration handles the case where task_id column may not exist
-- ============================================================================

-- Create tasks for ALL design items that don't have a migrated task yet
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
    quantity,
    revision_count,
    design_file_urls,
    proof_file_urls,
    final_file_urls,
    client_notes,
    internal_notes,
    requires_approval,
    approved_by,
    approval_notes,
    submitted_for_approval_at,
    approved_at,
    assigned_at,
    started_at,
    design_deadline,
    design_start_date,
    product_id,
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
    edi.tenant_id,
    edi.item_name,  -- title
    COALESCE(edi.internal_notes, edi.description),  -- description
    edi.status,
    CASE
        WHEN edi.design_deadline IS NOT NULL AND edi.design_deadline < CURRENT_DATE THEN 'urgent'
        WHEN edi.design_deadline IS NOT NULL AND edi.design_deadline < CURRENT_DATE + 7 THEN 'high'
        ELSE 'medium'
    END,  -- priority based on deadline
    edi.assigned_designer_id,  -- assigned_to
    edi.created_by,
    'event',  -- entity_type
    edi.event_id,  -- entity_id
    edi.design_deadline,  -- due_date
    edi.completed_at,
    'design',  -- department
    'design',  -- task_type
    edi.quantity,
    edi.revision_count,
    edi.design_file_urls,
    edi.proof_file_urls,
    edi.final_file_urls,
    edi.client_notes,
    edi.internal_notes,
    true,  -- requires_approval
    edi.approved_by,
    edi.approval_notes,
    edi.submitted_for_approval_at,
    edi.approved_at,
    edi.assigned_at,
    edi.started_at,
    edi.design_deadline,
    edi.design_start_date,
    edi.product_id,
    edi.auto_created,
    edi.workflow_id,
    edi.workflow_execution_id,
    'event_design_items',
    edi.id,
    edi.created_at,
    edi.updated_at
FROM event_design_items edi
WHERE NOT EXISTS (
    -- Don't duplicate if already migrated
    SELECT 1 FROM tasks t
    WHERE t.migrated_from_table = 'event_design_items'
    AND t.migrated_from_id = edi.id
);

-- Add task_id column to event_design_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_design_items' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE event_design_items
            ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_event_design_items_task
            ON event_design_items(task_id);

        COMMENT ON COLUMN event_design_items.task_id IS 'Linked task in the unified tasks system';
    END IF;
END $$;

-- Link design items to their newly created tasks
UPDATE event_design_items edi
SET task_id = t.id
FROM tasks t
WHERE t.migrated_from_table = 'event_design_items'
AND t.migrated_from_id = edi.id
AND edi.task_id IS NULL;

-- Log results
DO $$
DECLARE
    migrated_count INTEGER;
    linked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM tasks
    WHERE migrated_from_table = 'event_design_items';

    SELECT COUNT(*) INTO linked_count
    FROM event_design_items
    WHERE task_id IS NOT NULL;

    RAISE NOTICE 'Design items migration: % tasks created, % design items now linked', migrated_count, linked_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
