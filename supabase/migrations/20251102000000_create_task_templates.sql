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

-- RLS Policy for tenant isolation
-- Matches the pattern used in other tables (tasks, etc.)
-- Uses tenant_id from JWT token for isolation
CREATE POLICY tenant_isolation_task_templates ON task_templates
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

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
