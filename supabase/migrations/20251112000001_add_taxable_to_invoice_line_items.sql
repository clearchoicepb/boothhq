-- Add taxable field to invoice_line_items
-- This allows per-line-item control over tax application

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS taxable BOOLEAN DEFAULT true;

-- Update existing records to be taxable by default
UPDATE invoice_line_items
SET taxable = true
WHERE taxable IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN invoice_line_items.taxable IS 'Whether tax should be applied to this line item';
