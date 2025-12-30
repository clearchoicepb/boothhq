-- Add invoice_type column to distinguish between event-linked and general invoices
ALTER TABLE invoices
ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'event'
CHECK (invoice_type IN ('event', 'general'));

-- Update existing invoices: set type based on event_id presence
UPDATE invoices
SET invoice_type = CASE
  WHEN event_id IS NOT NULL THEN 'event'
  ELSE 'general'
END;

-- Add index for filtering by type
CREATE INDEX idx_invoices_type ON invoices(tenant_id, invoice_type);

-- Add comment for documentation
COMMENT ON COLUMN invoices.invoice_type IS 'Type of invoice: event (linked to event) or general (account-only)';
