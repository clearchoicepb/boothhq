-- ============================================================================
-- PHASE 2A: Migrate design_item_types to task_templates
--
-- This migration copies design item type definitions into the unified
-- task_templates table. Original records are preserved for rollback.
-- ============================================================================

-- Insert design_item_types into task_templates
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
    dit.tenant_id,
    dit.name,
    dit.description,
    'design',  -- department
    'design',  -- task_type
    dit.name,  -- default_title (same as name)
    dit.description,  -- default_description
    'medium',  -- default_priority
    dit.is_active,  -- enabled
    dit.is_active,  -- is_active
    dit.due_date_days,  -- days_before_event (maps from due_date_days)
    COALESCE(dit.requires_approval, true),  -- requires_approval
    COALESCE(dit.display_order, 0),
    dit.category,
    'design_item_types',  -- migrated_from_table
    dit.id,  -- migrated_from_id
    dit.created_at,
    dit.updated_at
FROM design_item_types dit
WHERE NOT EXISTS (
    -- Don't duplicate if already migrated
    SELECT 1 FROM task_templates tt
    WHERE tt.migrated_from_table = 'design_item_types'
    AND tt.migrated_from_id = dit.id
);

-- Log migration results
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM task_templates
    WHERE migrated_from_table = 'design_item_types';

    RAISE NOTICE 'Migrated % design_item_types to task_templates', migrated_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
