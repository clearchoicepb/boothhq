-- Create product_group_items junction table
-- Links inventory items to product groups
CREATE TABLE IF NOT EXISTS product_group_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,

  -- Relations
  product_group_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL,

  -- Tracking
  date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints: prevent duplicate items in same group
  UNIQUE(tenant_id, product_group_id, inventory_item_id)
);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_groups') THEN
    ALTER TABLE product_group_items
      ADD CONSTRAINT fk_product_group_items_group
      FOREIGN KEY (product_group_id)
      REFERENCES product_groups(id)
      ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    ALTER TABLE product_group_items
      ADD CONSTRAINT fk_product_group_items_item
      FOREIGN KEY (inventory_item_id)
      REFERENCES inventory_items(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_group_items_tenant ON product_group_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_group_items_group ON product_group_items(product_group_id);
CREATE INDEX IF NOT EXISTS idx_product_group_items_item ON product_group_items(inventory_item_id);

-- Add comments
COMMENT ON TABLE product_group_items IS 'Junction table linking inventory items to product groups';
COMMENT ON COLUMN product_group_items.date_added IS 'When item was added to the product group';
