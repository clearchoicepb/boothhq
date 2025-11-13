-- Create consumable inventory tracking system
-- Tracks quantities of consumable items (media, paper, supplies)
-- Supports automatic usage tracking and low stock alerts

CREATE TABLE IF NOT EXISTS consumable_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES equipment_categories(id) ON DELETE RESTRICT,

  -- Quantity tracking
  current_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_of_measure VARCHAR(50) NOT NULL, -- 'prints', 'sheets', 'rolls', etc.

  -- Reorder tracking
  last_reorder_date DATE,
  last_reorder_quantity DECIMAL(10, 2),
  last_reorder_cost DECIMAL(10, 2),

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_consumable_per_tenant UNIQUE(tenant_id, category_id),
  CONSTRAINT check_current_quantity_positive CHECK (current_quantity >= 0)
);

-- Usage log for tracking consumption
CREATE TABLE IF NOT EXISTS consumable_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consumable_id UUID NOT NULL REFERENCES consumable_inventory(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Usage details
  quantity_used DECIMAL(10, 2) NOT NULL,
  usage_type VARCHAR(50) DEFAULT 'event' CHECK (usage_type IN ('event', 'manual', 'adjustment', 'waste')),
  usage_date DATE NOT NULL,
  notes TEXT,

  -- Audit fields
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consumable_inventory_tenant ON consumable_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consumable_inventory_category ON consumable_inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_log_consumable ON consumable_usage_log(consumable_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_log_event ON consumable_usage_log(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consumable_usage_log_date ON consumable_usage_log(tenant_id, usage_date DESC);

-- Trigger for updated_at on consumable_inventory
CREATE TRIGGER update_consumable_inventory_updated_at
  BEFORE UPDATE ON consumable_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update consumable quantity when usage is logged
CREATE OR REPLACE FUNCTION update_consumable_quantity_on_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct the quantity used from current inventory
  UPDATE consumable_inventory
  SET
    current_quantity = current_quantity - NEW.quantity_used,
    updated_at = NOW()
  WHERE id = NEW.consumable_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consumable_quantity_on_usage
  AFTER INSERT ON consumable_usage_log
  FOR EACH ROW
  EXECUTE FUNCTION update_consumable_quantity_on_usage();

-- Seed consumable inventory records for existing tenants with Media/Paper category
INSERT INTO consumable_inventory (tenant_id, category_id, current_quantity, unit_of_measure)
SELECT
  ec.tenant_id,
  ec.id as category_id,
  5000 as current_quantity, -- Default starting quantity
  ec.unit_of_measure
FROM equipment_categories ec
WHERE ec.is_consumable = true
  AND ec.category_type = 'consumable'
ON CONFLICT (tenant_id, category_id) DO NOTHING;

-- Grant permissions
GRANT ALL ON consumable_inventory TO service_role;
GRANT ALL ON consumable_inventory TO authenticated;
GRANT SELECT ON consumable_inventory TO anon;

GRANT ALL ON consumable_usage_log TO service_role;
GRANT ALL ON consumable_usage_log TO authenticated;
GRANT SELECT ON consumable_usage_log TO anon;

-- Add comments
COMMENT ON TABLE consumable_inventory IS 'Current inventory levels for consumable items (media, paper, supplies)';
COMMENT ON TABLE consumable_usage_log IS 'Historical log of consumable usage for events and manual adjustments';
COMMENT ON COLUMN consumable_inventory.current_quantity IS 'Current quantity in stock (automatically updated by usage log)';
COMMENT ON COLUMN consumable_usage_log.usage_type IS 'Type of usage: event (auto-tracked), manual, adjustment, or waste';
