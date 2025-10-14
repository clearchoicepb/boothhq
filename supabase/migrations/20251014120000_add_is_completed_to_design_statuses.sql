-- Add is_completed field to design_statuses
-- This allows marking which statuses represent completion states

ALTER TABLE design_statuses
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

COMMENT ON COLUMN design_statuses.is_completed IS 'Whether this status represents a completed state (affects dashboard filtering and task completion)';

-- Update the "Approved" status to be marked as completed by default
UPDATE design_statuses
SET is_completed = true
WHERE slug = 'approved' AND is_default = true;

-- Update the create_default_design_statuses function to include is_completed
CREATE OR REPLACE FUNCTION create_default_design_statuses(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO design_statuses (tenant_id, name, slug, color, is_default, is_active, is_completed, display_order)
  VALUES
    (p_tenant_id, 'Pending Design Form', 'pending_design_form', 'gray', true, true, false, 1),
    (p_tenant_id, 'Design Form Received', 'design_form_received', 'blue', true, true, false, 2),
    (p_tenant_id, 'Initial Design in Progress', 'initial_design_in_progress', 'yellow', true, true, false, 3),
    (p_tenant_id, 'Pending Client Approval', 'pending_client_approval', 'orange', true, true, false, 4),
    (p_tenant_id, 'Design Edits in Progress', 'design_edits_in_progress', 'purple', true, true, false, 5),
    (p_tenant_id, 'Approved', 'approved', 'green', true, true, true, 6)
  ON CONFLICT (tenant_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
