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
CREATE INDEX IF NOT EXISTS idx_booth_types_tenant_id ON booth_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booth_types_is_active ON booth_types(is_active);
CREATE INDEX IF NOT EXISTS idx_booth_types_sort_order ON booth_types(sort_order);

CREATE INDEX IF NOT EXISTS idx_equipment_types_tenant_id ON equipment_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_types_is_active ON equipment_types(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_types_sort_order ON equipment_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_equipment_types_category ON equipment_types(category);

-- Enable RLS
ALTER TABLE booth_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booth_types' AND policyname = 'tenant_isolation_booth_types') THEN
    CREATE POLICY tenant_isolation_booth_types ON booth_types
      FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_types' AND policyname = 'tenant_isolation_equipment_types') THEN
    CREATE POLICY tenant_isolation_equipment_types ON equipment_types
      FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- Add updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_booth_types_updated_at') THEN
    CREATE TRIGGER update_booth_types_updated_at BEFORE UPDATE ON booth_types
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_equipment_types_updated_at') THEN
    CREATE TRIGGER update_equipment_types_updated_at BEFORE UPDATE ON equipment_types
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default booth types and equipment types for ALL existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- Loop through all tenants and insert defaults for each
  FOR tenant_record IN SELECT id FROM tenants LOOP
    -- Insert default booth types
    INSERT INTO booth_types (tenant_id, name, display_name, description, default_required_items, sort_order) VALUES
      (tenant_record.id, 'standard', 'Standard', 'Basic photo booth setup', '{"camera": 1, "ipad": 1, "printer": 1}', 1),
      (tenant_record.id, 'premium', 'Premium', 'Enhanced booth with additional features', '{"camera": 1, "ipad": 1, "printer": 1, "backdrop": 1, "lighting": 2}', 2),
      (tenant_record.id, 'deluxe', 'Deluxe', 'Top-tier booth with all amenities', '{"camera": 1, "ipad": 2, "printer": 1, "backdrop": 1, "lighting": 2, "props": 1}', 3),
      (tenant_record.id, 'custom', 'Custom', 'Customized booth configuration', '{}', 4)
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Insert default equipment types
    INSERT INTO equipment_types (tenant_id, name, display_name, description, icon, category, sort_order) VALUES
      (tenant_record.id, 'camera', 'Camera', 'DSLR, Mirrorless, or other cameras', 'camera', 'core', 1),
      (tenant_record.id, 'ipad', 'iPad/Tablet', 'Tablets for booth interface', 'tablet', 'core', 2),
      (tenant_record.id, 'printer', 'Printer', 'Photo printers', 'printer', 'core', 3),
      (tenant_record.id, 'backdrop', 'Backdrop', 'Photo backgrounds and backdrops', 'image', 'decoration', 4),
      (tenant_record.id, 'lighting', 'Lighting', 'Ring lights, LED panels, etc.', 'lightbulb', 'equipment', 5),
      (tenant_record.id, 'props', 'Props', 'Photo props and accessories', 'star', 'decoration', 6),
      (tenant_record.id, 'stand', 'Stand/Mount', 'Tripods, stands, and mounts', 'move', 'equipment', 7),
      (tenant_record.id, 'cable', 'Cable', 'Power and data cables', 'zap', 'accessory', 8),
      (tenant_record.id, 'power', 'Power Supply', 'Batteries and power adapters', 'battery', 'accessory', 9),
      (tenant_record.id, 'case', 'Case/Bag', 'Transport cases and bags', 'package', 'accessory', 10),
      (tenant_record.id, 'other', 'Other', 'Miscellaneous equipment', 'box', 'other', 99)
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Booth and equipment types tables created successfully!';
  RAISE NOTICE 'Added default booth types and equipment types for % tenant(s)', (SELECT COUNT(*) FROM tenants);
END $$;
