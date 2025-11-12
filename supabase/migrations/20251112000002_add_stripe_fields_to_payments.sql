-- Create payments table for tenant database
-- Note: tenant_id is stored as UUID but no FK to tenants (since tenants table is in app DB)
-- This migration is designed to run on TENANT databases, not the application database
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  payment_intent_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if the table already exists
DO $$
BEGIN
  -- Add tenant_id if missing (no FK since tenants table is in app database)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payments' AND column_name='tenant_id') THEN
    ALTER TABLE payments ADD COLUMN tenant_id UUID NOT NULL;
  END IF;

  -- Add payment_intent_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payments' AND column_name='payment_intent_id') THEN
    ALTER TABLE payments ADD COLUMN payment_intent_id TEXT;
  END IF;

  -- Add status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payments' AND column_name='status') THEN
    ALTER TABLE payments ADD COLUMN status TEXT DEFAULT 'completed';
  END IF;

  -- Add processed_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payments' AND column_name='processed_at') THEN
    ALTER TABLE payments ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add constraint on status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'payments' AND constraint_name = 'payments_status_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'completed', 'failed'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Populate tenant_id from invoices if missing
UPDATE payments p
SET tenant_id = i.tenant_id
FROM invoices i
WHERE p.invoice_id = i.id
AND p.tenant_id IS NULL;

-- Update existing payments to have 'completed' status if null
UPDATE payments
SET status = 'completed'
WHERE status IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Payment records for invoices including Stripe transactions';
COMMENT ON COLUMN payments.payment_intent_id IS 'Stripe PaymentIntent ID for tracking payment in Stripe';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, completed, or failed';
COMMENT ON COLUMN payments.processed_at IS 'Timestamp when payment was successfully processed';
