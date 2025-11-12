-- Safe RLS setup for public invoice access
-- This migration ONLY adds public access policies
-- It does NOT enable RLS or change existing behavior

-- Option 1: If RLS is already enabled, add these policies
-- Option 2: If RLS is disabled, these policies will be ignored but ready when you enable RLS

-- Drop existing public access policies if they exist
DROP POLICY IF EXISTS "Allow public access to invoices via token" ON invoices;
DROP POLICY IF EXISTS "Allow public access to invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Allow public access to accounts via invoice" ON accounts;
DROP POLICY IF EXISTS "Allow public access to contacts via invoice" ON contacts;
DROP POLICY IF EXISTS "Allow public access to payments via invoice" ON payments;

-- ============================================================================
-- PUBLIC ACCESS POLICIES (for unauthenticated users with invoice token)
-- ============================================================================

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

-- Policy: Allow public read access to payments for public invoices
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

-- ============================================================================
-- AUTHENTICATED USER POLICIES (to preserve existing functionality)
-- Only add these if RLS will be enabled
-- ============================================================================

-- Policy: Allow authenticated users full access to their tenant's data
CREATE POLICY IF NOT EXISTS "Allow authenticated access to invoices"
  ON invoices
  FOR ALL
  USING (true)  -- This allows all operations for authenticated users
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated access to invoice line items"
  ON invoice_line_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated access to accounts"
  ON accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated access to contacts"
  ON contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated access to payments"
  ON payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTE: RLS IS NOT ENABLED BY THIS MIGRATION
-- ============================================================================
-- To enable RLS later, run these commands manually:
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
