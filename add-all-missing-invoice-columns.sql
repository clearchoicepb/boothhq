-- Add all potentially missing columns to invoices table

-- Add payment_terms column
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';

-- Add tax_rate column (if not exists)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 4) DEFAULT 0.08;

-- Verify all required columns exist
-- Run this to check the current structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position;
