-- Add sections column to store section composition
ALTER TABLE templates ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Update template_type CHECK constraint to allow new template types
-- First, drop the existing constraint
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_template_type_check;

-- Add new constraint with expanded types (keeping original types + new section-based types)
ALTER TABLE templates ADD CONSTRAINT templates_template_type_check
  CHECK (template_type IN ('email', 'sms', 'contract', 'corporate', 'private', 'lease', 'custom'));

-- Add comments
COMMENT ON COLUMN templates.sections IS 'Array of section objects: [{section_id: uuid, content: text, order: int}]';

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_templates_sections ON templates USING gin(sections);
