-- Create physical_addresses table for warehouse and office locations
CREATE TABLE IF NOT EXISTS physical_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,

  -- Address fields
  location_name VARCHAR(255) NOT NULL, -- e.g., "Main Warehouse", "North Office"
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100) NOT NULL,
  zip_postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'United States',

  -- Optional notes
  location_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, location_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_physical_addresses_tenant ON physical_addresses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_physical_addresses_location_name ON physical_addresses(tenant_id, location_name);

-- Trigger for updated_at (only create if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_physical_addresses_updated_at
      BEFORE UPDATE ON physical_addresses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE physical_addresses IS 'Physical warehouse and office locations for inventory assignment';
COMMENT ON COLUMN physical_addresses.location_name IS 'Friendly name like "Main Warehouse" or "North Office"';
