-- Add discount support to invoice line items
-- This migration adds the necessary structure for invoice line items to support discounts

-- First, ensure all required columns exist
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(20);

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS package_id UUID;

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS add_on_id UUID;

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing records to have default values
UPDATE invoice_line_items
SET item_type = 'custom'
WHERE item_type IS NULL;

UPDATE invoice_line_items
SET name = description
WHERE name IS NULL AND description IS NOT NULL;

UPDATE invoice_line_items
SET name = 'Line Item'
WHERE name IS NULL;

-- Make item_type NOT NULL after setting defaults
ALTER TABLE invoice_line_items
  ALTER COLUMN item_type SET NOT NULL;

ALTER TABLE invoice_line_items
  ALTER COLUMN name SET NOT NULL;

-- Drop existing check constraint if it exists
ALTER TABLE invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_item_type_check;

-- Add check constraint that includes 'discount'
ALTER TABLE invoice_line_items
  ADD CONSTRAINT invoice_line_items_item_type_check
  CHECK (item_type IN ('package', 'add_on', 'custom', 'discount'));

-- Add comment to explain the discount type
COMMENT ON COLUMN invoice_line_items.item_type IS 'Type of line item: package, add_on, custom, or discount';

-- Add index on item_type for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item_type ON invoice_line_items(item_type);

-- Add index on tenant_id if column exists
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON invoice_line_items(tenant_id);
