-- Create packages table for reusable service packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Package details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,

  -- Categorization
  category VARCHAR(50), -- 'private_events', 'corporate_activations', 'custom'

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create add_ons table for reusable add-on items
CREATE TABLE IF NOT EXISTS add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Add-on details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'each', -- 'each', 'hour', 'set', 'day', etc.

  -- Categorization
  category VARCHAR(50), -- 'props', 'equipment', 'staffing', 'printing', etc.

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunity_line_items table for quote/pricing line items
CREATE TABLE IF NOT EXISTS opportunity_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,

  -- Item type and references
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('package', 'add_on', 'custom')),
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  add_on_id UUID REFERENCES add_ons(id) ON DELETE SET NULL,

  -- Item details (captured at time of adding to opportunity)
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL, -- quantity * unit_price

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_packages_tenant_id ON packages(tenant_id);
CREATE INDEX idx_packages_category ON packages(category);
CREATE INDEX idx_packages_is_active ON packages(is_active);

CREATE INDEX idx_add_ons_tenant_id ON add_ons(tenant_id);
CREATE INDEX idx_add_ons_category ON add_ons(category);
CREATE INDEX idx_add_ons_is_active ON add_ons(is_active);

CREATE INDEX idx_opportunity_line_items_tenant_id ON opportunity_line_items(tenant_id);
CREATE INDEX idx_opportunity_line_items_opportunity_id ON opportunity_line_items(opportunity_id);
CREATE INDEX idx_opportunity_line_items_item_type ON opportunity_line_items(item_type);
CREATE INDEX idx_opportunity_line_items_package_id ON opportunity_line_items(package_id);
CREATE INDEX idx_opportunity_line_items_add_on_id ON opportunity_line_items(add_on_id);

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY tenant_isolation_packages ON packages
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_add_ons ON add_ons
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_opportunity_line_items ON opportunity_line_items
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Updated_at triggers
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_add_ons_updated_at
  BEFORE UPDATE ON add_ons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunity_line_items_updated_at
  BEFORE UPDATE ON opportunity_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
