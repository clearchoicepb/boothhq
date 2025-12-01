-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD ASSIGN EVENT ROLE ACTION TO WORKFLOW AUTOMATION SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Extend workflow_actions to support assigning users to event staff roles.
--   This allows automation like "When wedding event created, assign John to Event Manager"
--
-- ACTION TYPE:
--   - assign_event_role: Assigns a user to a staff role for an event
--     Requires: staff_role_id (from app DB) + assigned_to_user_id
--
-- MULTI-TENANT:
--   *** RUN THIS IN THE TENANT DATABASE (NOT APPLICATION DB) ***
--   staff_role_id is stored as UUID without FK constraint (cross-DB reference)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Add staff_role_id to workflow_actions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflow_actions
  ADD COLUMN IF NOT EXISTS staff_role_id UUID;

-- Add index for staff role lookups
CREATE INDEX IF NOT EXISTS idx_workflow_actions_staff_role_id
  ON workflow_actions(staff_role_id)
  WHERE staff_role_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Update workflow_executions status constraint to include 'skipped'
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old constraint if exists
ALTER TABLE workflow_executions
  DROP CONSTRAINT IF EXISTS workflow_executions_status_check;

-- Add new constraint that includes 'skipped' status (for condition failures)
ALTER TABLE workflow_executions
  ADD CONSTRAINT workflow_executions_status_check CHECK (
    status IN ('running', 'completed', 'failed', 'partial', 'skipped')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN workflow_actions.staff_role_id IS
  'For assign_event_role actions: UUID of staff_role from application database. No FK constraint due to cross-database architecture.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Reload schema
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
