-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD WORKFLOW TRACKING COLUMNS TO event_design_items
-- ═══════════════════════════════════════════════════════════════════════════════
-- Add columns to track auto-created design items from workflows
-- Matches the same columns added to tasks table
--
-- MULTI-TENANT:
--   *** RUN THIS IN THE TENANT DATABASE (NOT APPLICATION DB) ***
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add workflow tracking columns to event_design_items
ALTER TABLE event_design_items
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS workflow_id UUID,
  ADD COLUMN IF NOT EXISTS workflow_execution_id UUID;

-- Add foreign key constraints (if workflows and workflow_executions tables exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    ALTER TABLE event_design_items
      ADD CONSTRAINT fk_event_design_items_workflow
      FOREIGN KEY (workflow_id) 
      REFERENCES workflows(id) 
      ON DELETE SET NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
    ALTER TABLE event_design_items
      ADD CONSTRAINT fk_event_design_items_workflow_execution
      FOREIGN KEY (workflow_execution_id) 
      REFERENCES workflow_executions(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_design_items_auto_created 
  ON event_design_items(auto_created);

CREATE INDEX IF NOT EXISTS idx_event_design_items_workflow_id 
  ON event_design_items(workflow_id);

CREATE INDEX IF NOT EXISTS idx_event_design_items_workflow_execution_id 
  ON event_design_items(workflow_execution_id);

-- Add comments
COMMENT ON COLUMN event_design_items.auto_created IS 'True if this design item was created by a workflow automation';
COMMENT ON COLUMN event_design_items.workflow_id IS 'ID of the workflow that created this design item (if auto-created)';
COMMENT ON COLUMN event_design_items.workflow_execution_id IS 'ID of the workflow execution that created this design item (if auto-created)';

-- Reload schema
NOTIFY pgrst, 'reload schema';

