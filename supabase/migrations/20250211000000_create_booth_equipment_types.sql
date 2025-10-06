-- Create booth_types table for custom booth type definitions
CREATE TABLE IF NOT EXISTS booth_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  default_required_items JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_booth_type_per_tenant UNIQUE(tenant_id, name)
);

-- Create equipment_types table for custom equipment categories
CREATE TABLE IF NOT EXISTS equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_equipment_type_per_tenant UNIQUE(tenant_id, name)
);

-- Create indexes
CREATE INDEX idx_booth_types_tenant_id ON booth_types(tenant_id);
CREATE INDEX idx_booth_types_is_active ON booth_types(is_active);
CREATE INDEX idx_booth_types_sort_order ON booth_types(sort_order);

CREATE INDEX idx_equipment_types_tenant_id ON equipment_types(tenant_id);
CREATE INDEX idx_equipment_types_is_active ON equipment_types(is_active);
CREATE INDEX idx_equipment_types_sort_order ON equipment_types(sort_order);
CREATE INDEX idx_equipment_types_category ON equipment_types(category);

-- Enable RLS
ALTER TABLE booth_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation_booth_types ON booth_types
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_equipment_types ON equipment_types
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_booth_types_updated_at BEFORE UPDATE ON booth_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_types_updated_at BEFORE UPDATE ON equipment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default booth types (these will be inserted for each tenant when they sign up)
-- For now, we'll add them for the existing tenant
DO $$
DECLARE
  default_tenant_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
  -- Insert default booth types
  INSERT INTO booth_types (tenant_id, name, display_name, description, default_required_items, sort_order) VALUES
    (default_tenant_id, 'standard', 'Standard', 'Basic photo booth setup', '{"camera": 1, "ipad": 1, "printer": 1}', 1),
    (default_tenant_id, 'premium', 'Premium', 'Enhanced booth with additional features', '{"camera": 1, "ipad": 1, "printer": 1, "backdrop": 1, "lighting": 2}', 2),
    (default_tenant_id, 'deluxe', 'Deluxe', 'Top-tier booth with all amenities', '{"camera": 1, "ipad": 2, "printer": 1, "backdrop": 1, "lighting": 2, "props": 1}', 3),
    (default_tenant_id, 'custom', 'Custom', 'Customized booth configuration', '{}', 4)
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Insert default equipment types
  INSERT INTO equipment_types (tenant_id, name, display_name, description, icon, category, sort_order) VALUES
    (default_tenant_id, 'camera', 'Camera', 'DSLR, Mirrorless, or other cameras', 'camera', 'core', 1),
    (default_tenant_id, 'ipad', 'iPad/Tablet', 'Tablets for booth interface', 'tablet', 'core', 2),
    (default_tenant_id, 'printer', 'Printer', 'Photo printers', 'printer', 'core', 3),
    (default_tenant_id, 'backdrop', 'Backdrop', 'Photo backgrounds and backdrops', 'image', 'decoration', 4),
    (default_tenant_id, 'lighting', 'Lighting', 'Ring lights, LED panels, etc.', 'lightbulb', 'equipment', 5),
    (default_tenant_id, 'props', 'Props', 'Photo props and accessories', 'star', 'decoration', 6),
    (default_tenant_id, 'stand', 'Stand/Mount', 'Tripods, stands, and mounts', 'move', 'equipment', 7),
    (default_tenant_id, 'cable', 'Cable', 'Power and data cables', 'zap', 'accessory', 8),
    (default_tenant_id, 'power', 'Power Supply', 'Batteries and power adapters', 'battery', 'accessory', 9),
    (default_tenant_id, 'case', 'Case/Bag', 'Transport cases and bags', 'package', 'accessory', 10),
    (default_tenant_id, 'other', 'Other', 'Miscellaneous equipment', 'box', 'other', 99)
  ON CONFLICT (tenant_id, name) DO NOTHING;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Booth and equipment types tables created successfully!';
    RAISE NOTICE 'Added default booth types: standard, premium, deluxe, custom';
    RAISE NOTICE 'Added default equipment types: camera, ipad, printer, etc.';
END $$;
