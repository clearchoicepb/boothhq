-- Add paid_amount column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0;

-- Add balance_amount column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(10, 2) DEFAULT 0;

-- Update existing records to calculate balance_amount
-- (This will set balance equal to total for existing invoices with 0 paid)
UPDATE invoices
SET
  paid_amount = COALESCE(paid_amount, 0),
  balance_amount = total_amount - COALESCE(paid_amount, 0)
WHERE balance_amount = 0 OR balance_amount IS NULL;
