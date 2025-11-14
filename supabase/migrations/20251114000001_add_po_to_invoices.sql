-- Add purchase_order field to invoices table
ALTER TABLE invoices
ADD COLUMN purchase_order VARCHAR(255);

-- Add comment to explain the field
COMMENT ON COLUMN invoices.purchase_order IS 'Customer purchase order number for tracking';
