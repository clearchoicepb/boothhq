-- Add operations_item_type_id to workflow_actions table
-- This allows workflows to create operations items like they do for design items

ALTER TABLE workflow_actions
  ADD COLUMN IF NOT EXISTS operations_item_type_id UUID REFERENCES operations_item_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN workflow_actions.operations_item_type_id IS 'Operations item type for create_ops_item actions';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_actions_ops_item_type ON workflow_actions(operations_item_type_id) WHERE operations_item_type_id IS NOT NULL;
