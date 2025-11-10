-- Create product_groups table for equipment bundles/kits
-- Product groups MUST be assigned to either a user or physical address
CREATE TABLE IF NOT EXISTS product_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Group details
  group_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Assignment (polymorphic - can be user OR physical address)
  assigned_to_type VARCHAR(50) NOT NULL CHECK (assigned_to_type IN ('user', 'physical_address')),
  assigned_to_id UUID NOT NULL, -- References either users(id) or physical_addresses(id)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, group_name)
);

-- Indexes for performance
CREATE INDEX idx_product_groups_tenant ON product_groups(tenant_id);
CREATE INDEX idx_product_groups_assigned_to ON product_groups(assigned_to_type, assigned_to_id);
CREATE INDEX idx_product_groups_name ON product_groups(tenant_id, group_name);

-- Enable RLS
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view product groups in their tenant"
  ON product_groups FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert product groups in their tenant"
  ON product_groups FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update product groups in their tenant"
  ON product_groups FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete product groups in their tenant"
  ON product_groups FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_product_groups_updated_at
  BEFORE UPDATE ON product_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE product_groups IS 'Equipment bundles/kits that can be assigned to users or locations';
COMMENT ON COLUMN product_groups.assigned_to_type IS 'Type of assignment: user or physical_address';
COMMENT ON COLUMN product_groups.assigned_to_id IS 'ID of user or physical address (polymorphic reference)';
