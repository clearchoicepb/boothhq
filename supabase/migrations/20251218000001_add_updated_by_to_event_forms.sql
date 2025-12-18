-- ============================================
-- Add updated_by column to event forms tables
-- Tracks who last modified templates and forms
-- ============================================

-- Add updated_by to event_form_templates
ALTER TABLE event_form_templates
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add updated_by to event_forms
ALTER TABLE event_forms
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Comments
COMMENT ON COLUMN event_form_templates.updated_by IS 'Multi-DB: References users table in auth DB, tracks last modifier';
COMMENT ON COLUMN event_forms.updated_by IS 'Multi-DB: References users table in auth DB, tracks last modifier';
