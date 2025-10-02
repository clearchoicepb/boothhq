-- Create templates table for email, SMS, and contract templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template metadata
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('email', 'sms', 'contract')),
  name VARCHAR(255) NOT NULL,

  -- Content
  subject VARCHAR(500), -- Only used for email templates
  content TEXT NOT NULL,

  -- Merge fields configuration (stores available variables for this template)
  merge_fields JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_templates_tenant_id ON templates(tenant_id);
CREATE INDEX idx_templates_type ON templates(template_type);
CREATE INDEX idx_templates_active ON templates(is_active);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_templates ON templates
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE templates IS 'Templates for emails, SMS messages, and contracts';
COMMENT ON COLUMN templates.template_type IS 'Type of template: email, sms, contract';
COMMENT ON COLUMN templates.subject IS 'Subject line for email templates only';
COMMENT ON COLUMN templates.content IS 'Template content with merge fields like {{first_name}}';
COMMENT ON COLUMN templates.merge_fields IS 'Array of available merge field names';
