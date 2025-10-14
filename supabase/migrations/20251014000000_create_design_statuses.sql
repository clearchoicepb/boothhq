-- Create configurable design statuses table
-- Allows tenants to customize their design workflow statuses

CREATE TABLE IF NOT EXISTS design_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- URL-friendly identifier
  color VARCHAR(50) DEFAULT 'gray', -- UI color hint: gray, blue, yellow, green, red, purple, orange

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- System-provided default statuses
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_design_status_per_tenant UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_design_statuses_tenant ON design_statuses(tenant_id);
CREATE INDEX idx_design_statuses_active ON design_statuses(tenant_id, is_active);

-- Enable RLS
ALTER TABLE design_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY design_statuses_tenant_isolation ON design_statuses
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Trigger for updated_at
CREATE TRIGGER update_design_statuses_updated_at
  BEFORE UPDATE ON design_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE design_statuses IS 'Configurable design workflow statuses per tenant';
COMMENT ON COLUMN design_statuses.slug IS 'URL-friendly identifier for status';
COMMENT ON COLUMN design_statuses.color IS 'UI color hint: gray, blue, yellow, green, red, purple, orange';
COMMENT ON COLUMN design_statuses.is_default IS 'Whether this is a system-provided default status';

-- Function to create default design statuses for a tenant
CREATE OR REPLACE FUNCTION create_default_design_statuses(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO design_statuses (tenant_id, name, slug, color, is_default, is_active, display_order)
  VALUES
    (p_tenant_id, 'Pending Design Form', 'pending_design_form', 'gray', true, true, 1),
    (p_tenant_id, 'Design Form Received', 'design_form_received', 'blue', true, true, 2),
    (p_tenant_id, 'Initial Design in Progress', 'initial_design_in_progress', 'yellow', true, true, 3),
    (p_tenant_id, 'Pending Client Approval', 'pending_client_approval', 'orange', true, true, 4),
    (p_tenant_id, 'Design Edits in Progress', 'design_edits_in_progress', 'purple', true, true, 5),
    (p_tenant_id, 'Approved', 'approved', 'green', true, true, 6)
  ON CONFLICT (tenant_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_design_statuses IS 'Creates default design statuses for a new tenant';

-- Seed default statuses for existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    PERFORM create_default_design_statuses(tenant_record.id);
  END LOOP;

  RAISE NOTICE 'Default design statuses created for all existing tenants';
END $$;

-- Remove the CHECK constraint from event_design_items to allow custom statuses
ALTER TABLE event_design_items DROP CONSTRAINT IF EXISTS event_design_items_status_check;

-- Add comment explaining the status field is now flexible
COMMENT ON COLUMN event_design_items.status IS 'Design workflow status - values defined in design_statuses table';
