-- Create product_group_items junction table
-- Links inventory items to product groups
CREATE TABLE IF NOT EXISTS product_group_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relations
  product_group_id UUID NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  -- Tracking
  date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints: prevent duplicate items in same group
  UNIQUE(tenant_id, product_group_id, inventory_item_id)
);

-- Indexes for performance
CREATE INDEX idx_product_group_items_tenant ON product_group_items(tenant_id);
CREATE INDEX idx_product_group_items_group ON product_group_items(product_group_id);
CREATE INDEX idx_product_group_items_item ON product_group_items(inventory_item_id);

-- Enable RLS
ALTER TABLE product_group_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view product group items in their tenant"
  ON product_group_items FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert product group items in their tenant"
  ON product_group_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update product group items in their tenant"
  ON product_group_items FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete product group items in their tenant"
  ON product_group_items FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Add comments
COMMENT ON TABLE product_group_items IS 'Junction table linking inventory items to product groups';
COMMENT ON COLUMN product_group_items.date_added IS 'When item was added to the product group';
