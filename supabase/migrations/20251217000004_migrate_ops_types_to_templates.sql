-- ============================================================================
-- PHASE 2B: Migrate operations_item_types to task_templates
--
-- This migration copies operations item type definitions into the unified
-- task_templates table. Original records are preserved for rollback.
-- ============================================================================

-- Insert operations_item_types into task_templates
INSERT INTO task_templates (
    id,
    tenant_id,
    name,
    description,
    department,
    task_type,
    default_title,
    default_description,
    default_priority,
    enabled,
    is_active,
    days_before_event,
    requires_approval,
    display_order,
    category,
    migrated_from_table,
    migrated_from_id,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),  -- New ID
    oit.tenant_id,
    oit.name,
    oit.description,
    'operations',  -- department
    'operations',  -- task_type
    oit.name,  -- default_title (same as name)
    oit.description,  -- default_description
    'medium',  -- default_priority
    oit.is_active,  -- enabled
    oit.is_active,  -- is_active
    oit.due_date_days,  -- days_before_event
    false,  -- requires_approval (ops items don't have approval workflow)
    COALESCE(oit.display_order, 0),
    oit.category,
    'operations_item_types',  -- migrated_from_table
    oit.id,  -- migrated_from_id
    oit.created_at,
    oit.updated_at
FROM operations_item_types oit
WHERE NOT EXISTS (
    -- Don't duplicate if already migrated
    SELECT 1 FROM task_templates tt
    WHERE tt.migrated_from_table = 'operations_item_types'
    AND tt.migrated_from_id = oit.id
);

-- Log migration results
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM task_templates
    WHERE migrated_from_table = 'operations_item_types';

    RAISE NOTICE 'Migrated % operations_item_types to task_templates', migrated_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
