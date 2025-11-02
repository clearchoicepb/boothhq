-- Task Templates Table
-- Tenant-configurable task templates for quick task creation

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Template identity
  name TEXT NOT NULL,
  description TEXT,

  -- Department & type
  department TEXT NOT NULL,
  task_type TEXT,

  -- Default task properties
  default_title TEXT NOT NULL,
  default_description TEXT,
  default_priority TEXT NOT NULL DEFAULT 'medium',
  default_due_in_days INTEGER,
  requires_assignment BOOLEAN DEFAULT false,

  -- Template configuration
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_priority CHECK (default_priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_templates_tenant ON task_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_department ON task_templates(tenant_id, department) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_task_templates_display_order ON task_templates(tenant_id, department, display_order);

-- Enable RLS
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: These policies work for both app DB (with tenants table) and tenant DB (without tenants table)
-- The auth.uid() refers to the current authenticated user

-- SELECT: Users can view templates in their tenant
CREATE POLICY "Users can view templates in their tenant"
  ON task_templates FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- INSERT: Only admins can create templates
CREATE POLICY "Admins can insert templates"
  ON task_templates FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin')
    )
  );

-- UPDATE: Only admins can update templates
CREATE POLICY "Admins can update templates"
  ON task_templates FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin')
    )
  );

-- DELETE: Only admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON task_templates FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin')
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_task_templates_updated_at();
