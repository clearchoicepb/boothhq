-- ============================================================================
-- Add urgency threshold columns to task_templates
-- These columns existed on design_item_types and operations_item_types
-- and are needed for design dashboard deadline calculations
-- ============================================================================

ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS urgent_threshold_days INTEGER DEFAULT 14,
    ADD COLUMN IF NOT EXISTS missed_deadline_days INTEGER DEFAULT 13,
    ADD COLUMN IF NOT EXISTS due_date_days INTEGER DEFAULT 21;

-- Add comments
COMMENT ON COLUMN task_templates.due_date_days IS 'Days before event when task is due (default deadline)';
COMMENT ON COLUMN task_templates.urgent_threshold_days IS 'Days before event when task becomes urgent';
COMMENT ON COLUMN task_templates.missed_deadline_days IS 'Days before event when deadline is considered missed';

-- Update existing templates from migrated design_item_types with their original values
UPDATE task_templates tt
SET
    due_date_days = dit.due_date_days,
    urgent_threshold_days = dit.urgent_threshold_days,
    missed_deadline_days = dit.missed_deadline_days
FROM design_item_types dit
WHERE tt.migrated_from_table = 'design_item_types'
AND tt.migrated_from_id = dit.id
AND dit.due_date_days IS NOT NULL;

-- Update existing templates from migrated operations_item_types with their original values
UPDATE task_templates tt
SET
    due_date_days = oit.due_date_days,
    urgent_threshold_days = oit.urgent_threshold_days,
    missed_deadline_days = oit.missed_deadline_days
FROM operations_item_types oit
WHERE tt.migrated_from_table = 'operations_item_types'
AND tt.migrated_from_id = oit.id
AND oit.due_date_days IS NOT NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
