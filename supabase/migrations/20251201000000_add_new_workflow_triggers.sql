-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: ADD NEW WORKFLOW TRIGGER TYPES
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Extend the workflow automation system to support additional trigger types:
--   - task_created: When a new task is created
--   - task_status_changed: When a task's status changes
--   - event_date_approaching: X days before an event date (time-based)
--
-- CHANGES:
--   - Add trigger_config JSONB column for trigger-specific settings
--   - Relax event_type_ids constraint for non-event triggers
--   - Add task_status_from/task_status_to columns for task_status_changed trigger
--   - Add days_before column for event_date_approaching trigger
--
-- MULTI-TENANT:
--   *** RUN THIS IN THE TENANT DATABASE (NOT APPLICATION DB) ***
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Add trigger_config column for flexible trigger settings
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}'::jsonb;

-- Index for trigger_config queries
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_config
  ON workflows USING GIN (trigger_config);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Update the event_type_ids constraint
--         For non-event triggers, event_type_ids can be empty
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing constraint
ALTER TABLE workflows
  DROP CONSTRAINT IF EXISTS workflows_event_type_ids_not_empty;

-- Add new flexible constraint
ALTER TABLE workflows
  ADD CONSTRAINT workflows_trigger_config_valid CHECK (
    -- event_created requires at least one event type
    (trigger_type = 'event_created' AND array_length(event_type_ids, 1) > 0)
    -- task triggers don't require event types (but may optionally filter by them)
    OR trigger_type IN ('task_created', 'task_status_changed', 'event_date_approaching')
    -- Future trigger types can be added here
    OR trigger_type NOT IN ('event_created', 'task_created', 'task_status_changed', 'event_date_approaching')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Drop old constraint if it exists
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflows
  DROP CONSTRAINT IF EXISTS workflows_trigger_event_type_check;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Update indexes for new trigger types
-- ─────────────────────────────────────────────────────────────────────────────

-- Index for task-based triggers
CREATE INDEX IF NOT EXISTS idx_workflows_task_triggers
  ON workflows(trigger_type)
  WHERE is_active = true
  AND trigger_type IN ('task_created', 'task_status_changed');

-- Index for time-based triggers
CREATE INDEX IF NOT EXISTS idx_workflows_time_triggers
  ON workflows(trigger_type)
  WHERE is_active = true
  AND trigger_type = 'event_date_approaching';

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN workflows.trigger_config IS 'Trigger-specific configuration as JSONB. Examples:
  - task_status_changed: {"from_status": "pending", "to_status": "completed"}
  - event_date_approaching: {"days_before": 7}
  - task_created: {"task_types": ["design", "production"]}';

-- ─────────────────────────────────────────────────────────────────────────────
-- RELOAD SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
