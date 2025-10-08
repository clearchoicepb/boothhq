-- Add payment_terms column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
