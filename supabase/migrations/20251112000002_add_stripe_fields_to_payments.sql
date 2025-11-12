-- Add Stripe-related fields to payments table for payment processing
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create index on payment_intent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);

-- Create index on invoice_id for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Update existing payments to have 'completed' status if null
UPDATE payments
SET status = 'completed'
WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN payments.payment_intent_id IS 'Stripe PaymentIntent ID for tracking payment in Stripe';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, completed, or failed';
COMMENT ON COLUMN payments.processed_at IS 'Timestamp when payment was successfully processed';
