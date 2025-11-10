-- Create inventory_items table for comprehensive inventory tracking
-- This replaces the simpler equipment_items table with enhanced tracking capabilities
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,

  -- Basic item information
  item_name VARCHAR(255) NOT NULL,
  item_category VARCHAR(100) NOT NULL, -- References item_categories.category_name

  -- Tracking type: either serial number tracking OR quantity tracking
  tracking_type VARCHAR(50) NOT NULL CHECK (tracking_type IN ('serial_number', 'total_quantity')),
  serial_number VARCHAR(255), -- Required if tracking_type = 'serial_number'
  total_quantity INTEGER, -- Required if tracking_type = 'total_quantity'

  -- Purchase information
  purchase_date DATE NOT NULL,
  item_value DECIMAL(10, 2) NOT NULL, -- Purchase/replacement value

  -- Assignment (polymorphic - can be user, physical address, OR product group)
  assigned_to_type VARCHAR(50) CHECK (assigned_to_type IN ('user', 'physical_address', 'product_group')),
  assigned_to_id UUID, -- References users(id), physical_addresses(id), or product_groups(id)

  -- Optional notes
  item_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  -- Serial number must be unique per tenant when tracking by serial number
  CONSTRAINT unique_serial_per_tenant UNIQUE NULLS NOT DISTINCT (tenant_id, serial_number),

  -- Validation: serial_number required if tracking_type = 'serial_number'
  CONSTRAINT check_serial_number_required
    CHECK (
      (tracking_type = 'serial_number' AND serial_number IS NOT NULL AND serial_number != '') OR
      (tracking_type != 'serial_number')
    ),

  -- Validation: total_quantity required if tracking_type = 'total_quantity'
  CONSTRAINT check_total_quantity_required
    CHECK (
      (tracking_type = 'total_quantity' AND total_quantity IS NOT NULL AND total_quantity > 0) OR
      (tracking_type != 'total_quantity')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(item_category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tracking_type ON inventory_items(tracking_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_assigned_to ON inventory_items(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON inventory_items(tenant_id, serial_number) WHERE serial_number IS NOT NULL;

-- Trigger for updated_at (only create if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_inventory_items_updated_at
      BEFORE UPDATE ON inventory_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Grant permissions to all roles
GRANT ALL ON inventory_items TO service_role;
GRANT ALL ON inventory_items TO authenticated;
GRANT ALL ON inventory_items TO anon;

-- Ensure schema permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Add comments
COMMENT ON TABLE inventory_items IS 'Comprehensive inventory management with flexible tracking types';
COMMENT ON COLUMN inventory_items.tracking_type IS 'serial_number for unique items, total_quantity for bulk items';
COMMENT ON COLUMN inventory_items.serial_number IS 'Manufacturers serial number (required for serial_number tracking)';
COMMENT ON COLUMN inventory_items.total_quantity IS 'Total count of items (required for total_quantity tracking)';
COMMENT ON COLUMN inventory_items.assigned_to_type IS 'Type: user, physical_address, or product_group';
COMMENT ON COLUMN inventory_items.item_value IS 'Purchase or replacement value in currency';
