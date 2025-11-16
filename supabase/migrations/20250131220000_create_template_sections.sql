-- Create template_sections table for reusable agreement sections
CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID, -- Multi-DB: No FK constraint, managed by application layer
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'header', 'party-info', 'event-details', 'payment', 'operations', 'legal', 'signature'
  content TEXT NOT NULL,
  description TEXT, -- Brief description of what this section is for
  is_system BOOLEAN DEFAULT false, -- System sections vs custom user sections
  is_required BOOLEAN DEFAULT false, -- Must be included in template
  merge_fields TEXT[], -- Array of available merge fields like ['{{company_name}}', '{{event_date}}']
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- Multi-DB: No FK constraint, managed by application layer
);

-- Indexes
CREATE INDEX idx_template_sections_tenant ON template_sections(tenant_id);
CREATE INDEX idx_template_sections_category ON template_sections(category);
CREATE INDEX idx_template_sections_system ON template_sections(is_system);

-- RLS Policies
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: users can only see their tenant's sections + system sections
CREATE POLICY "Users can view their tenant sections and system sections"
  ON template_sections FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    OR is_system = true
  );

CREATE POLICY "Users can insert their tenant sections"
  ON template_sections FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can update their tenant sections"
  ON template_sections FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can delete their tenant sections"
  ON template_sections FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Comments
COMMENT ON TABLE template_sections IS 'Reusable sections for building contract templates';
COMMENT ON COLUMN template_sections.tenant_id IS 'Multi-DB: References tenants table in auth DB, managed by application layer';
COMMENT ON COLUMN template_sections.is_system IS 'System sections are pre-built and available to all tenants';
COMMENT ON COLUMN template_sections.is_required IS 'Required sections must be included in every template';
COMMENT ON COLUMN template_sections.created_by IS 'Multi-DB: References users table in auth DB, managed by application layer';
