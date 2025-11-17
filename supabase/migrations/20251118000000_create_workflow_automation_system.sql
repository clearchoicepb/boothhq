-- ═══════════════════════════════════════════════════════════════════════════════
-- WORKFLOW AUTOMATION SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Zapier-style workflow automation for BootHQ CRM
--   Automatically creates and assigns tasks when events are created
--
-- ARCHITECTURE:
--   1. workflows: Define trigger conditions (e.g., "Wedding Event Created")
--   2. workflow_actions: Define what happens (e.g., "Create Task X, Assign to User Y")
--   3. workflow_executions: Audit log of workflow runs
--   4. tasks: Existing table, add columns to track auto-created tasks
--
-- MULTI-TENANT:
--   *** RUN THIS IN THE TENANT DATABASE (NOT APPLICATION DB) ***
--   Each tenant has their own database, so no `tenants` table exists here
--   tenant_id is just a UUID field (no FK constraint) used for API-level filtering
--   No RLS enabled - API layer handles tenant isolation
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: workflows
-- ─────────────────────────────────────────────────────────────────────────────
-- Defines workflow templates (the "Zap" equivalent)
-- Each workflow has a trigger (event type) and a series of actions

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Workflow identity
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL DEFAULT 'event_created',
  event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT workflows_name_tenant_unique UNIQUE(tenant_id, name),
  CONSTRAINT workflows_trigger_event_type_check CHECK (
    (trigger_type = 'event_created' AND event_type_id IS NOT NULL)
    OR (trigger_type != 'event_created')
  )
);

-- Indexes
CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_workflows_event_type_id ON workflows(event_type_id) WHERE is_active = true;
CREATE INDEX idx_workflows_is_active ON workflows(is_active);
CREATE INDEX idx_workflows_trigger_type ON workflows(trigger_type) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workflows IS 'Workflow automation templates (Zapier-style)';
COMMENT ON COLUMN workflows.trigger_type IS 'What event triggers this workflow (currently only event_created)';
COMMENT ON COLUMN workflows.event_type_id IS 'Which event type triggers this workflow (e.g., Wedding, Conference)';
COMMENT ON COLUMN workflows.is_active IS 'Whether this workflow is enabled (inactive workflows do not execute)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: workflow_actions
-- ─────────────────────────────────────────────────────────────────────────────
-- Defines individual steps/actions within a workflow
-- Currently supports: create_task (extensible for future action types)

CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Action configuration
  action_type TEXT NOT NULL DEFAULT 'create_task',
  execution_order INTEGER NOT NULL DEFAULT 0,
  
  -- Task creation configuration
  task_template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Flexible configuration for future action types
  -- Example: { "notification_type": "email", "template": "welcome" }
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT workflow_actions_order_unique UNIQUE(workflow_id, execution_order),
  CONSTRAINT workflow_actions_task_template_check CHECK (
    (action_type = 'create_task' AND task_template_id IS NOT NULL AND assigned_to_user_id IS NOT NULL)
    OR (action_type != 'create_task')
  )
);

-- Indexes
CREATE INDEX idx_workflow_actions_workflow_id ON workflow_actions(workflow_id);
CREATE INDEX idx_workflow_actions_execution_order ON workflow_actions(workflow_id, execution_order);
CREATE INDEX idx_workflow_actions_action_type ON workflow_actions(action_type);
CREATE INDEX idx_workflow_actions_task_template_id ON workflow_actions(task_template_id);
CREATE INDEX idx_workflow_actions_assigned_to ON workflow_actions(assigned_to_user_id);

-- Updated_at trigger
CREATE TRIGGER workflow_actions_updated_at
  BEFORE UPDATE ON workflow_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workflow_actions IS 'Individual actions/steps within a workflow';
COMMENT ON COLUMN workflow_actions.action_type IS 'Type of action: create_task (extensible)';
COMMENT ON COLUMN workflow_actions.execution_order IS 'Order in which actions execute (0-indexed)';
COMMENT ON COLUMN workflow_actions.task_template_id IS 'Which task template to use (for create_task actions)';
COMMENT ON COLUMN workflow_actions.assigned_to_user_id IS 'Who to assign the task to (for create_task actions)';
COMMENT ON COLUMN workflow_actions.config IS 'Flexible JSON config for future action types';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: workflow_executions
-- ─────────────────────────────────────────────────────────────────────────────
-- Audit log of workflow runs
-- Tracks what happened, when, and any errors

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Trigger context
  trigger_type TEXT NOT NULL,
  trigger_entity_type TEXT, -- e.g., 'event'
  trigger_entity_id UUID, -- ID of the event that triggered this

  -- Execution results
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Actions executed (for audit trail)
  actions_executed INTEGER DEFAULT 0,
  actions_successful INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Created tasks (for quick reference)
  created_task_ids UUID[] DEFAULT ARRAY[]::UUID[],

  CONSTRAINT workflow_executions_status_check CHECK (
    status IN ('running', 'completed', 'failed', 'partial')
  )
);

-- Indexes
CREATE INDEX idx_workflow_executions_tenant_id ON workflow_executions(tenant_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_trigger_entity ON workflow_executions(trigger_entity_type, trigger_entity_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- Comments
COMMENT ON TABLE workflow_executions IS 'Audit log of workflow executions';
COMMENT ON COLUMN workflow_executions.status IS 'running, completed, failed, partial (some actions failed)';
COMMENT ON COLUMN workflow_executions.trigger_entity_id IS 'ID of entity that triggered workflow (e.g., event ID)';
COMMENT ON COLUMN workflow_executions.created_task_ids IS 'Array of task IDs created by this execution';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: Update tasks table
-- ─────────────────────────────────────────────────────────────────────────────
-- Add columns to track auto-created tasks

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_auto_created ON tasks(auto_created) WHERE auto_created = true;
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_execution_id ON tasks(workflow_execution_id);

-- Comments
COMMENT ON COLUMN tasks.auto_created IS 'Whether this task was auto-created by a workflow (vs. manually created)';
COMMENT ON COLUMN tasks.workflow_id IS 'Which workflow created this task (if auto-created)';
COMMENT ON COLUMN tasks.workflow_execution_id IS 'Which workflow execution created this task (for audit trail)';

-- ─────────────────────────────────────────────────────────────────────────────
-- PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- Grant permissions (no RLS, API-level filtering)

GRANT ALL ON workflows TO service_role;
GRANT ALL ON workflows TO authenticated;
GRANT ALL ON workflows TO anon;

GRANT ALL ON workflow_actions TO service_role;
GRANT ALL ON workflow_actions TO authenticated;
GRANT ALL ON workflow_actions TO anon;

GRANT ALL ON workflow_executions TO service_role;
GRANT ALL ON workflow_executions TO authenticated;
GRANT ALL ON workflow_executions TO anon;

-- Schema permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTION: Get active workflows for event type
-- ─────────────────────────────────────────────────────────────────────────────
-- Convenience function for workflow engine

CREATE OR REPLACE FUNCTION get_active_workflows_for_event_type(
  p_tenant_id UUID,
  p_event_type_id UUID
)
RETURNS TABLE (
  workflow_id UUID,
  workflow_name TEXT,
  workflow_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description
  FROM workflows w
  WHERE w.tenant_id = p_tenant_id
    AND w.event_type_id = p_event_type_id
    AND w.is_active = true
    AND w.trigger_type = 'event_created'
  ORDER BY w.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_workflows_for_event_type IS 'Get all active workflows for a specific event type';

-- ─────────────────────────────────────────────────────────────────────────────
-- RELOAD SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

