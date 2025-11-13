-- Add proper RLS policies for payments table
-- This migration fixes the "permission denied for table payments" error

-- First, ensure RLS is enabled on the payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow authenticated access to payments" ON payments;
DROP POLICY IF EXISTS "Tenant isolation for payments" ON payments;
DROP POLICY IF EXISTS "tenant_isolation_payments" ON payments;
DROP POLICY IF EXISTS "Allow public access to payments via invoice" ON payments;

-- ============================================================================
-- AUTHENTICATED USER POLICIES
-- ============================================================================

-- Policy: Allow authenticated users to SELECT payments for their tenant
CREATE POLICY "Authenticated users can view payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Policy: Allow authenticated users to INSERT payments for their tenant
CREATE POLICY "Authenticated users can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Policy: Allow authenticated users to UPDATE payments for their tenant
CREATE POLICY "Authenticated users can update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid)
  WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Policy: Allow authenticated users to DELETE payments for their tenant
CREATE POLICY "Authenticated users can delete payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ============================================================================
-- PUBLIC ACCESS POLICIES (for public invoice payment links)
-- ============================================================================

-- Policy: Allow public read access to payments for public invoices
CREATE POLICY "Public can view payments for public invoices"
  ON payments
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );

-- Policy: Allow public INSERT for payments on public invoices (for Stripe payments)
CREATE POLICY "Public can create payments for public invoices"
  ON payments
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
        AND invoices.public_token IS NOT NULL
        AND invoices.public_token != ''
        AND invoices.status != 'draft'
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Authenticated users can view payments" ON payments IS
  'Allows authenticated users to view payments for their tenant using app.tenant_id session variable';
COMMENT ON POLICY "Authenticated users can create payments" ON payments IS
  'Allows authenticated users to create new payment records for their tenant';
COMMENT ON POLICY "Public can view payments for public invoices" ON payments IS
  'Allows anonymous users to view payments for invoices with a public token';
COMMENT ON POLICY "Public can create payments for public invoices" ON payments IS
  'Allows anonymous users to create payments (via Stripe) for invoices with a public token';
