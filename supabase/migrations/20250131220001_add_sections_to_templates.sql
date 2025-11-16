-- Add sections column to store section composition
ALTER TABLE templates ADD COLUMN sections JSONB DEFAULT '[]'::jsonb;

-- Add template_type for categorization
ALTER TABLE templates ADD COLUMN template_type TEXT DEFAULT 'custom';

COMMENT ON COLUMN templates.sections IS 'Array of section objects: [{section_id: uuid, content: text, order: int}]';
COMMENT ON COLUMN templates.template_type IS 'Template category: corporate, private, lease, custom';

-- Create index for JSONB queries
CREATE INDEX idx_templates_sections ON templates USING gin(sections);
