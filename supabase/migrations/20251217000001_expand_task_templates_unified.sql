-- ============================================================================
-- PHASE 1B: Expand task_templates to support all task types
-- Merges concepts from design_item_types and operations_item_types
--
-- Allows task_templates to define:
-- - Timeline calculation rules (days before event, etc.)
-- - Approval requirements
-- - Default quantities
-- - Display settings (icon, color, order)
-- ============================================================================

ALTER TABLE task_templates
    -- Timeline calculation fields (from design_item_types)
    ADD COLUMN IF NOT EXISTS days_before_event INTEGER,
    ADD COLUMN IF NOT EXISTS days_after_booking INTEGER,
    ADD COLUMN IF NOT EXISTS start_days_before_event INTEGER,
    ADD COLUMN IF NOT EXISTS start_days_after_booking INTEGER,
    ADD COLUMN IF NOT EXISTS use_event_date BOOLEAN DEFAULT true,

    -- Approval settings
    ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 1,

    -- Display settings
    ADD COLUMN IF NOT EXISTS icon TEXT,
    ADD COLUMN IF NOT EXISTS color TEXT,

    -- Category (mirrors design_item_types category)
    ADD COLUMN IF NOT EXISTS category TEXT,

    -- Active status (task_templates uses 'enabled', add is_active for compatibility)
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,

    -- Legacy tracking
    ADD COLUMN IF NOT EXISTS migrated_from_table TEXT,
    ADD COLUMN IF NOT EXISTS migrated_from_id UUID;

-- Sync is_active with enabled for backwards compatibility
UPDATE task_templates
SET is_active = enabled
WHERE is_active IS NULL OR is_active != enabled;

-- Index for filtering by task_type (may already exist)
CREATE INDEX IF NOT EXISTS idx_task_templates_task_type ON task_templates(task_type);
CREATE INDEX IF NOT EXISTS idx_task_templates_tenant_type ON task_templates(tenant_id, task_type);
CREATE INDEX IF NOT EXISTS idx_task_templates_display_order ON task_templates(tenant_id, task_type, display_order);

-- Index for migrated records tracking
CREATE INDEX IF NOT EXISTS idx_task_templates_migrated_from ON task_templates(migrated_from_table, migrated_from_id)
    WHERE migrated_from_table IS NOT NULL;

-- Add comments
COMMENT ON COLUMN task_templates.days_before_event IS 'Default due date: X days before event date';
COMMENT ON COLUMN task_templates.days_after_booking IS 'Alternative due date: X days after booking/creation';
COMMENT ON COLUMN task_templates.start_days_before_event IS 'Default start date: X days before event date';
COMMENT ON COLUMN task_templates.start_days_after_booking IS 'Alternative start date: X days after booking';
COMMENT ON COLUMN task_templates.use_event_date IS 'True to calculate from event date, false to use booking date';
COMMENT ON COLUMN task_templates.requires_approval IS 'Whether tasks from this template require approval';
COMMENT ON COLUMN task_templates.default_quantity IS 'Default quantity for design tasks';
COMMENT ON COLUMN task_templates.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN task_templates.color IS 'Color for UI display (hex or named)';
COMMENT ON COLUMN task_templates.category IS 'Category: print, digital, environmental, promotional, equipment, staffing, logistics, venue, setup, other';
COMMENT ON COLUMN task_templates.is_active IS 'Whether this template is active (synced with enabled)';
COMMENT ON COLUMN task_templates.migrated_from_table IS 'If migrated, source table name (design_item_types or operations_item_types)';
COMMENT ON COLUMN task_templates.migrated_from_id IS 'If migrated, original record ID for reference';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
