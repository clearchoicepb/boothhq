-- Create item_categories table for standardized equipment categories
-- Categories are the same across all tenants (no tenant_id)
CREATE TABLE IF NOT EXISTS item_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert predefined categories as specified in requirements
INSERT INTO item_categories (category_name, sort_order) VALUES
  ('Camera', 1),
  ('Printer', 2),
  ('iPad', 3),
  ('Computer', 4),
  ('Flash/Strobe', 5),
  ('Lighting', 6),
  ('Backdrop', 7),
  ('Backdrop Stand', 8),
  ('Misc. Fabric', 9),
  ('Photo Kiosk', 10),
  ('Printer Station', 11),
  ('Tripod', 12),
  ('Custom Experience', 13)
ON CONFLICT (category_name) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_item_categories_sort_order ON item_categories(sort_order);

-- Grant permissions to all roles
GRANT ALL ON item_categories TO service_role;
GRANT ALL ON item_categories TO authenticated;
GRANT ALL ON item_categories TO anon;

-- Ensure schema permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Add comment
COMMENT ON TABLE item_categories IS 'Predefined equipment categories shared across all tenants';
