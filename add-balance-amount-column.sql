-- Add balance_amount column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(10, 2) DEFAULT 0;

-- Update existing records to calculate balance_amount
UPDATE invoices
SET balance_amount = total_amount - COALESCE(paid_amount, 0)
WHERE balance_amount IS NULL OR balance_amount = 0;
