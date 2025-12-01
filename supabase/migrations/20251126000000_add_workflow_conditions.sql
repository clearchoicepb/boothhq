-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD CONDITIONS TO WORKFLOWS (Phase 1 of Flexible Automation)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Add optional conditions to workflows for filtering when they execute.
--   Conditions are evaluated AFTER trigger match, BEFORE action execution.
--
-- EXAMPLE CONDITIONS:
--   [
--     {"field": "event.status", "operator": "equals", "value": "confirmed"},
--     {"field": "event.event_type_id", "operator": "in", "value": ["uuid1", "uuid2"]}
--   ]
--
-- BACKWARD COMPATIBLE:
--   - Default empty array means all existing workflows continue to work
--   - Empty conditions = always pass (no filtering)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add conditions column to workflows table
ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;

-- Add index for JSONB queries (GIN index for containment queries)
CREATE INDEX IF NOT EXISTS idx_workflows_conditions
  ON workflows USING GIN (conditions);

-- Add column to workflow_executions to track condition evaluation
ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS conditions_evaluated BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS conditions_passed BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS condition_results JSONB DEFAULT NULL;

-- Update status check to include 'skipped' for condition failures
ALTER TABLE workflow_executions
  DROP CONSTRAINT IF EXISTS workflow_executions_status_check;

ALTER TABLE workflow_executions
  ADD CONSTRAINT workflow_executions_status_check CHECK (
    status IN ('running', 'completed', 'failed', 'partial', 'skipped')
  );

-- Comments
COMMENT ON COLUMN workflows.conditions IS 'Optional array of conditions that must pass for workflow to execute. Format: [{"field": "event.status", "operator": "equals", "value": "confirmed"}]';
COMMENT ON COLUMN workflow_executions.conditions_evaluated IS 'Whether conditions were evaluated (null if no conditions)';
COMMENT ON COLUMN workflow_executions.conditions_passed IS 'Whether all conditions passed (null if not evaluated)';
COMMENT ON COLUMN workflow_executions.condition_results IS 'Detailed results of each condition evaluation for debugging';

-- Reload schema
NOTIFY pgrst, 'reload schema';
