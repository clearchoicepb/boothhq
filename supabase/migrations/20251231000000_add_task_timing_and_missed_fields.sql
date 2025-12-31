-- ============================================================================
-- Add task_timing and missed fields for pre/post event task management
--
-- This migration adds:
-- 1. task_timing column to task_templates (pre_event, post_event, general)
-- 2. task_timing, missed, missed_at columns to tasks
-- 3. Indexes for filtering missed tasks
-- ============================================================================

-- Add task_timing to task_templates
ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS task_timing TEXT DEFAULT 'pre_event';

-- Add constraint to task_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'task_templates_task_timing_check'
        AND table_name = 'task_templates'
    ) THEN
        ALTER TABLE task_templates
        ADD CONSTRAINT task_templates_task_timing_check
        CHECK (task_timing IN ('pre_event', 'post_event', 'general'));
    END IF;
END $$;

-- Add task_timing to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS task_timing TEXT DEFAULT 'pre_event';

-- Add missed flag to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS missed BOOLEAN DEFAULT false;

-- Add missed_at timestamp to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS missed_at TIMESTAMPTZ;

-- Add constraint to tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tasks_task_timing_check'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_task_timing_check
        CHECK (task_timing IN ('pre_event', 'post_event', 'general'));
    END IF;
END $$;

-- Index for filtering missed tasks
CREATE INDEX IF NOT EXISTS idx_tasks_missed ON tasks(missed) WHERE missed = true;

-- Index for filtering by task_timing
CREATE INDEX IF NOT EXISTS idx_tasks_task_timing ON tasks(task_timing);
CREATE INDEX IF NOT EXISTS idx_task_templates_task_timing ON task_templates(task_timing);

-- Add comments
COMMENT ON COLUMN task_templates.task_timing IS 'When task should be done relative to event: pre_event (before), post_event (after), general (no timing)';
COMMENT ON COLUMN tasks.task_timing IS 'Inherited from template: pre_event, post_event, or general';
COMMENT ON COLUMN tasks.missed IS 'True if pre-event task was not completed before event date passed';
COMMENT ON COLUMN tasks.missed_at IS 'Timestamp when task was marked as missed';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
