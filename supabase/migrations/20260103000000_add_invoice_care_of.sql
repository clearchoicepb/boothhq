-- Add care_of field to invoices table
-- This is a manually editable "Care Of" line for billing purposes

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS care_of TEXT;

COMMENT ON COLUMN invoices.care_of IS 'Optional C/O (Care Of) line for billing, e.g., "Accounts Payable Dept" or a specific person name';
