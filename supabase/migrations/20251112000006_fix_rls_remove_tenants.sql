-- Fix RLS policies for multi-database architecture
-- The tenants table is in the application database, not the tenant database
-- So we cannot create RLS policies for it here

-- Drop the invalid tenants policy
DROP POLICY IF EXISTS "Allow public access to tenants via invoice" ON tenants;

-- The other policies remain valid as they reference tables in the tenant database:
-- - invoices
-- - invoice_line_items
-- - accounts
-- - contacts
-- - payments

-- If the other policies don't exist yet, create them now:

-- Enable RLS on tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to invoices with a valid public_token
DROP POLICY IF EXISTS "Allow public access to invoices via token" ON invoices;
CREATE POLICY "Allow public access to invoices via token"
  ON invoices
  FOR SELECT
  USING (
    public_token IS NOT NULL
    AND public_token != ''
    AND status != 'draft'
  );

-- Policy: Allow public read access to line items for public invoices
DROP POLICY IF EXISTS "Allow public access to invoice line items" ON invoice_line_items;
CREATE POLICY "Allow public access to invoice line items"
  ON invoice_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );

-- Policy: Allow public read access to accounts linked to public invoices
DROP POLICY IF EXISTS "Allow public access to accounts via invoice" ON accounts;
CREATE POLICY "Allow public access to accounts via invoice"
  ON accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.account_id = accounts.id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );

-- Policy: Allow public read access to contacts linked to public invoices
DROP POLICY IF EXISTS "Allow public access to contacts via invoice" ON contacts;
CREATE POLICY "Allow public access to contacts via invoice"
  ON contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.contact_id = contacts.id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );

-- Policy: Allow public read access to payments for public invoices
DROP POLICY IF EXISTS "Allow public access to payments via invoice" ON payments;
CREATE POLICY "Allow public access to payments via invoice"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );
