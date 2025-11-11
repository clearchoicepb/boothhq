-- Fix unique_serial_per_tenant constraint to allow multiple NULL serial numbers
-- The current constraint uses NULLS NOT DISTINCT which treats NULL as a single value
-- We need to remove this so multiple items can have NULL serial numbers

-- Drop the existing constraint
ALTER TABLE inventory_items
DROP CONSTRAINT IF EXISTS unique_serial_per_tenant;

-- Recreate the constraint without NULLS NOT DISTINCT
-- This allows multiple rows to have NULL serial numbers (standard SQL behavior)
ALTER TABLE inventory_items
ADD CONSTRAINT unique_serial_per_tenant
UNIQUE (tenant_id, serial_number);

-- Comment
COMMENT ON CONSTRAINT unique_serial_per_tenant ON inventory_items IS 'Ensures serial numbers are unique per tenant. NULL values are allowed for multiple items (quantity-tracked items).';
