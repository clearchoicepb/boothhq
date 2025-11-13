-- Create equipment_categories table for tenant-specific category management
-- This replaces the global item_categories with tenant-specific categories
-- Supports both equipment and consumable categories

CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(50) DEFAULT '#6B7280',
  enabled BOOLEAN DEFAULT true,

  -- Maintenance configuration
  requires_maintenance BOOLEAN DEFAULT false,
  maintenance_interval_days INTEGER DEFAULT 90,
  maintenance_reminder_days INTEGER DEFAULT 7,

  -- Category type
  category_type VARCHAR(50) DEFAULT 'equipment' CHECK (category_type IN ('equipment', 'consumable')),

  -- Consumable-specific settings
  is_consumable BOOLEAN DEFAULT false,
  estimated_consumption_per_event DECIMAL(10, 2),
  unit_of_measure VARCHAR(50), -- 'prints', 'sheets', 'rolls', etc.
  low_stock_threshold DECIMAL(10, 2),

  -- Automation
  auto_track_usage BOOLEAN DEFAULT false,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_category_per_tenant UNIQUE(tenant_id, name),
  CONSTRAINT check_consumable_fields CHECK (
    (is_consumable = false) OR
    (is_consumable = true AND estimated_consumption_per_event IS NOT NULL AND unit_of_measure IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_categories_tenant ON equipment_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_type ON equipment_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_enabled ON equipment_categories(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_sort ON equipment_categories(tenant_id, sort_order);

-- Trigger for updated_at
CREATE TRIGGER update_equipment_categories_updated_at
  BEFORE UPDATE ON equipment_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed default equipment categories for all existing tenants from item_categories
INSERT INTO equipment_categories (tenant_id, name, description, color, requires_maintenance, maintenance_interval_days, category_type, sort_order)
SELECT
  t.id as tenant_id,
  ic.category_name as name,
  'Equipment category' as description,
  '#6B7280' as color,
  false as requires_maintenance,
  90 as maintenance_interval_days,
  'equipment' as category_type,
  ic.sort_order
FROM tenants t
CROSS JOIN item_categories ic
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Add default consumables category (Media/Paper) for all tenants
INSERT INTO equipment_categories (
  tenant_id,
  name,
  description,
  color,
  category_type,
  is_consumable,
  unit_of_measure,
  low_stock_threshold,
  estimated_consumption_per_event,
  sort_order
)
SELECT
  id as tenant_id,
  'Media/Paper' as name,
  'Consumable media and printing supplies' as description,
  '#F59E0B' as color,
  'consumable' as category_type,
  true as is_consumable,
  'prints' as unit_of_measure,
  1000 as low_stock_threshold,
  500 as estimated_consumption_per_event,
  9999 as sort_order -- Put at end
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Grant permissions
GRANT ALL ON equipment_categories TO service_role;
GRANT ALL ON equipment_categories TO authenticated;
GRANT SELECT ON equipment_categories TO anon;

-- Add comment
COMMENT ON TABLE equipment_categories IS 'Tenant-specific equipment and consumable categories with maintenance and tracking settings';
COMMENT ON COLUMN equipment_categories.category_type IS 'Type of category: equipment for physical items, consumable for supplies';
COMMENT ON COLUMN equipment_categories.is_consumable IS 'Whether this category tracks consumable items (paper, media, etc.)';
COMMENT ON COLUMN equipment_categories.estimated_consumption_per_event IS 'Estimated quantity consumed per event (for consumables)';
COMMENT ON COLUMN equipment_categories.low_stock_threshold IS 'Quantity threshold to trigger low stock alerts (for consumables)';
