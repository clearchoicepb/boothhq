-- ============================================
-- Event Forms System
-- Creates tables for custom event forms/questionnaires
-- ============================================

-- ===========================================
-- TABLE: event_form_templates
-- Reusable form templates that tenants can create
-- ===========================================
CREATE TABLE event_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Multi-DB: References tenants in auth DB
  name TEXT NOT NULL, -- e.g., "Logistics Form", "Design Brief"
  description TEXT, -- Internal notes about the template
  category TEXT DEFAULT 'other', -- logistics, design, survey, feedback, other
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  fields JSONB DEFAULT '[]'::jsonb, -- Array of field definitions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- Multi-DB: References users in auth DB
);

-- Indexes for event_form_templates
CREATE INDEX idx_event_form_templates_tenant ON event_form_templates(tenant_id);
CREATE INDEX idx_event_form_templates_status ON event_form_templates(tenant_id, status);
CREATE INDEX idx_event_form_templates_category ON event_form_templates(tenant_id, category);

-- ===========================================
-- TABLE: event_forms
-- Form instances attached to specific events
-- ===========================================
CREATE TABLE event_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Multi-DB: References tenants in auth DB
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES event_form_templates(id) ON DELETE SET NULL, -- NULL if created from scratch
  name TEXT NOT NULL, -- Form name (copied from template or custom)
  fields JSONB DEFAULT '[]'::jsonb, -- Form field definitions (copied from template, can be customized)
  responses JSONB, -- Submitted form data { fieldId: value, _submittedAt: timestamp }
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'completed')),
  public_id TEXT UNIQUE NOT NULL, -- Short URL-safe ID for public link (nanoid, 10-12 chars)
  sent_at TIMESTAMPTZ, -- When form link was first shared/copied
  viewed_at TIMESTAMPTZ, -- When client first viewed the form
  completed_at TIMESTAMPTZ, -- When client submitted the form
  field_mappings JSONB, -- Maps form field IDs to event field names for auto-update
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- Multi-DB: References users in auth DB
);

-- Indexes for event_forms
CREATE INDEX idx_event_forms_tenant ON event_forms(tenant_id);
CREATE INDEX idx_event_forms_event ON event_forms(event_id);
CREATE INDEX idx_event_forms_public_id ON event_forms(public_id);
CREATE INDEX idx_event_forms_status ON event_forms(tenant_id, status);
CREATE INDEX idx_event_forms_template ON event_forms(template_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- Following patterns from template_sections migration
-- ===========================================

-- Enable RLS on both tables
ALTER TABLE event_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_forms ENABLE ROW LEVEL SECURITY;

-- event_form_templates policies
CREATE POLICY "Users can view their tenant form templates"
  ON event_form_templates FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can insert their tenant form templates"
  ON event_form_templates FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can update their tenant form templates"
  ON event_form_templates FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can delete their tenant form templates"
  ON event_form_templates FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- event_forms policies
CREATE POLICY "Users can view their tenant event forms"
  ON event_forms FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can insert their tenant event forms"
  ON event_forms FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can update their tenant event forms"
  ON event_forms FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can delete their tenant event forms"
  ON event_forms FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- ===========================================
-- PUBLIC ACCESS POLICY
-- Allow public form viewing/submission via public_id
-- ===========================================

-- Policy to allow anyone to view a form by public_id (for public form page)
CREATE POLICY "Anyone can view forms by public_id"
  ON event_forms FOR SELECT
  USING (public_id IS NOT NULL);

-- Policy to allow public form submission (update responses)
CREATE POLICY "Anyone can submit form responses via public_id"
  ON event_forms FOR UPDATE
  USING (public_id IS NOT NULL)
  WITH CHECK (public_id IS NOT NULL);

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE event_form_templates IS 'Reusable form templates for gathering client information';
COMMENT ON TABLE event_forms IS 'Form instances attached to specific events';

COMMENT ON COLUMN event_form_templates.tenant_id IS 'Multi-DB: References tenants table in auth DB';
COMMENT ON COLUMN event_form_templates.fields IS 'JSON array of field definitions: [{id, type, label, required, options, ...}]';
COMMENT ON COLUMN event_form_templates.category IS 'Form category: logistics, design, survey, feedback, other';
COMMENT ON COLUMN event_form_templates.created_by IS 'Multi-DB: References users table in auth DB';

COMMENT ON COLUMN event_forms.tenant_id IS 'Multi-DB: References tenants table in auth DB';
COMMENT ON COLUMN event_forms.public_id IS 'Short URL-safe ID (nanoid) for public form link';
COMMENT ON COLUMN event_forms.fields IS 'Copied from template, can be customized per event';
COMMENT ON COLUMN event_forms.responses IS 'Submitted data: {fieldId: value, _submittedAt: ISO timestamp}';
COMMENT ON COLUMN event_forms.field_mappings IS 'Maps field IDs to event columns for auto-update on submission';
COMMENT ON COLUMN event_forms.created_by IS 'Multi-DB: References users table in auth DB';

-- ===========================================
-- TRIGGER: Update updated_at timestamp
-- ===========================================
CREATE OR REPLACE FUNCTION update_event_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_form_templates_updated_at
  BEFORE UPDATE ON event_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_event_forms_updated_at();

CREATE TRIGGER event_forms_updated_at
  BEFORE UPDATE ON event_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_event_forms_updated_at();
