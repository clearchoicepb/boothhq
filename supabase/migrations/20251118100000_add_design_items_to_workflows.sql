-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD DESIGN ITEM SUPPORT TO WORKFLOW AUTOMATION SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Extend workflow_actions to support creating design items with timeline
--   calculations, in addition to simple tasks.
--
-- DEPARTMENT-BASED ACTIONS:
--   - create_task             → General tasks (simple to-dos)
--   - create_design_item      → Design department (timeline-based)
--   - create_sales_task       → Sales department (future)
--   - create_ops_task         → Operations department (future)
--   - create_accounting_task  → Accounting department (future)
--
-- MULTI-TENANT:
--   *** RUN THIS IN THE TENANT DATABASE (NOT APPLICATION DB) ***
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Add design_item_type_id to workflow_actions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflow_actions
  ADD COLUMN IF NOT EXISTS design_item_type_id UUID REFERENCES design_item_types(id) ON DELETE CASCADE;

-- Add index for design item type lookups
CREATE INDEX IF NOT EXISTS idx_workflow_actions_design_item_type_id 
  ON workflow_actions(design_item_type_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Update constraints to support design item actions
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old constraint
ALTER TABLE workflow_actions
  DROP CONSTRAINT IF EXISTS workflow_actions_task_template_check;

-- Add new constraint that handles both task and design item actions
ALTER TABLE workflow_actions
  ADD CONSTRAINT workflow_actions_type_check CHECK (
    -- create_task requires task_template_id and assigned_to_user_id
    (action_type = 'create_task' 
     AND task_template_id IS NOT NULL 
     AND assigned_to_user_id IS NOT NULL
     AND design_item_type_id IS NULL)
    OR
    -- create_design_item requires design_item_type_id
    -- assigned_to_user_id is optional (can be null for unassigned design items)
    (action_type = 'create_design_item' 
     AND design_item_type_id IS NOT NULL 
     AND task_template_id IS NULL)
    OR
    -- Future action types (no specific requirements yet)
    (action_type NOT IN ('create_task', 'create_design_item'))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN workflow_actions.design_item_type_id IS 
  'For create_design_item actions: references design_item_types table';

COMMENT ON CONSTRAINT workflow_actions_type_check ON workflow_actions IS
  'Ensures proper fields are populated based on action_type:
   - create_task: requires task_template_id + assigned_to_user_id
   - create_design_item: requires design_item_type_id (assigned_to_user_id optional)
   - Other types: flexible for future expansion';

