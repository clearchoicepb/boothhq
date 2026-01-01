-- ============================================
-- Post Event Tab & Staff Forms Migration
-- Created: 2026-01-01
--
-- This migration adds:
-- 1. Post-event fields to events table (gallery URLs, recap deck)
-- 2. form_type column to event_form_templates (client vs staff)
-- 3. New staff_forms table for staff event recaps
-- ============================================

-- ===========================================
-- PART 1: Add Post Event Fields to Events Table
-- ===========================================

ALTER TABLE events
ADD COLUMN IF NOT EXISTS photo_gallery_url TEXT,
ADD COLUMN IF NOT EXISTS bts_gallery_url TEXT,
ADD COLUMN IF NOT EXISTS recap_deck_path TEXT,
ADD COLUMN IF NOT EXISTS recap_deck_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recap_deck_uploaded_by UUID;

COMMENT ON COLUMN events.photo_gallery_url IS 'External link to client photo gallery (e.g., SmugMug)';
COMMENT ON COLUMN events.bts_gallery_url IS 'External link to behind-the-scenes photo gallery';
COMMENT ON COLUMN events.recap_deck_path IS 'Supabase Storage path for post-event recap deck PDF';
COMMENT ON COLUMN events.recap_deck_uploaded_at IS 'When recap deck was uploaded';
COMMENT ON COLUMN events.recap_deck_uploaded_by IS 'User who uploaded the recap deck';

-- ===========================================
-- PART 2: Add form_type to Event Form Templates
-- Distinguishes client forms (sent to customers) from staff forms
-- ===========================================

ALTER TABLE event_form_templates
ADD COLUMN IF NOT EXISTS form_type TEXT DEFAULT 'client'
CHECK (form_type IN ('client', 'staff'));

COMMENT ON COLUMN event_form_templates.form_type IS 'Form recipient type: client (customers) or staff (internal team)';

-- Update existing templates to be client forms (they already are, just making explicit)
UPDATE event_form_templates
SET form_type = 'client'
WHERE form_type IS NULL;

-- Index for filtering by form_type
CREATE INDEX IF NOT EXISTS idx_event_form_templates_form_type
ON event_form_templates(tenant_id, form_type);

-- ===========================================
-- PART 3: Create Staff Forms Table
-- Tracks post-event feedback forms sent to staff members
-- ===========================================

CREATE TABLE IF NOT EXISTS staff_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,  -- Multi-DB: References tenants in auth DB
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_assignment_id UUID NOT NULL REFERENCES event_staff_assignments(id) ON DELETE CASCADE,
  template_id UUID REFERENCES event_form_templates(id) ON DELETE SET NULL,

  -- Form structure (copied from template at creation time)
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Public access
  public_id TEXT UNIQUE,  -- 11-char base64url for public URL

  -- Response data
  responses JSONB,  -- {fieldId: value, _submittedAt: timestamp}

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'completed')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Task linkage (auto-created task for staff member)
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One form per staff member per event
  UNIQUE(event_id, staff_assignment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_forms_tenant ON staff_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_forms_event ON staff_forms(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_forms_public_id ON staff_forms(public_id);
CREATE INDEX IF NOT EXISTS idx_staff_forms_status ON staff_forms(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_forms_assignment ON staff_forms(staff_assignment_id);

-- ===========================================
-- PART 4: Row Level Security for staff_forms
-- ===========================================

ALTER TABLE staff_forms ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY "Users can view their tenant staff forms"
  ON staff_forms FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can insert their tenant staff forms"
  ON staff_forms FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can update their tenant staff forms"
  ON staff_forms FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can delete their tenant staff forms"
  ON staff_forms FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Public access policies (for staff filling out forms)
CREATE POLICY "Anyone can view staff forms by public_id"
  ON staff_forms FOR SELECT
  USING (public_id IS NOT NULL);

CREATE POLICY "Anyone can submit staff form responses via public_id"
  ON staff_forms FOR UPDATE
  USING (public_id IS NOT NULL)
  WITH CHECK (public_id IS NOT NULL);

-- ===========================================
-- PART 5: Trigger for updated_at
-- Reuses existing function from event_forms migration
-- ===========================================

CREATE TRIGGER staff_forms_updated_at
  BEFORE UPDATE ON staff_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_event_forms_updated_at();

-- ===========================================
-- PART 6: Comments
-- ===========================================

COMMENT ON TABLE staff_forms IS 'Post-event feedback forms sent to staff members';
COMMENT ON COLUMN staff_forms.tenant_id IS 'Multi-DB: References tenants table in auth DB';
COMMENT ON COLUMN staff_forms.public_id IS 'Short URL-safe ID for public form link (staff access without login)';
COMMENT ON COLUMN staff_forms.fields IS 'JSON array of field definitions: [{id, type, label, required, options, ...}]';
COMMENT ON COLUMN staff_forms.responses IS 'Submitted data: {fieldId: value, _submittedAt: ISO timestamp}';
COMMENT ON COLUMN staff_forms.task_id IS 'Linked task that gets marked complete when form is submitted';

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT ALL ON staff_forms TO authenticated;
GRANT ALL ON staff_forms TO service_role;
