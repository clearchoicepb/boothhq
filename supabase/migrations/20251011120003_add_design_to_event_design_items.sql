-- Add additional fields to event_design_items for better workflow tracking
-- These fields support timeline calculation and task linkage

ALTER TABLE event_design_items
  ADD COLUMN IF NOT EXISTS design_start_date DATE,
  ADD COLUMN IF NOT EXISTS design_deadline DATE,
  ADD COLUMN IF NOT EXISTS custom_design_days INTEGER,
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

COMMENT ON COLUMN event_design_items.design_start_date IS 'Calculated start date for design work';
COMMENT ON COLUMN event_design_items.design_deadline IS 'Deadline for design completion (before production/shipping)';
COMMENT ON COLUMN event_design_items.custom_design_days IS 'Override for design days (if different from type default)';
COMMENT ON COLUMN event_design_items.task_id IS 'Linked task in the tasks system';

-- Create index for task linkage
CREATE INDEX IF NOT EXISTS idx_event_design_items_task ON event_design_items(task_id);

-- Create products table if it doesn't exist (for future integration)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  price DECIMAL(10,2),
  unit VARCHAR(50),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,

  -- Design integration fields
  requires_design BOOLEAN DEFAULT false,
  design_item_type_id UUID REFERENCES design_item_types(id) ON DELETE SET NULL,
  design_lead_time_override INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Products and services offered by the business';
COMMENT ON COLUMN products.requires_design IS 'Whether this product requires design work';
COMMENT ON COLUMN products.design_item_type_id IS 'Default design type to create when product is added to event';
COMMENT ON COLUMN products.design_lead_time_override IS 'Override default design lead time (in days)';

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_requires_design ON products(requires_design) WHERE requires_design = true;

-- RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_tenant_isolation ON products;
CREATE POLICY products_tenant_isolation ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Trigger for products updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
