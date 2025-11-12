-- Add RLS policies to allow public read access for invoices via public_token
-- This allows unauthenticated users to view invoices shared via public links

-- Enable RLS on tables if not already enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public access to invoices via token" ON invoices;
DROP POLICY IF EXISTS "Allow public access to invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Allow public access to accounts via invoice" ON accounts;
DROP POLICY IF EXISTS "Allow public access to contacts via invoice" ON contacts;
DROP POLICY IF EXISTS "Allow public access to tenants via invoice" ON tenants;
DROP POLICY IF EXISTS "Allow public access to payments via invoice" ON payments;

-- Policy: Allow public read access to invoices with a valid public_token
CREATE POLICY "Allow public access to invoices via token"
  ON invoices
  FOR SELECT
  USING (
    public_token IS NOT NULL
    AND public_token != ''
    AND status != 'draft'
  );

-- Policy: Allow public read access to line items for public invoices
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

-- Policy: Allow public read access to tenant info for public invoices
CREATE POLICY "Allow public access to tenants via invoice"
  ON tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.tenant_id = tenants.id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );

-- Policy: Allow public read access to payments for public invoices
-- (Optional - only if you want to show payment history on public invoices)
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
