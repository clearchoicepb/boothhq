-- Update invoice status constraint to include new status values
-- Drop the old constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new constraint with updated status values
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'draft',
    'no_payments_received',
    'partially_paid',
    'paid_in_full',
    'past_due',
    'cancelled',
    -- Keep old values for backward compatibility during transition
    'sent',
    'paid',
    'overdue'
  ));

-- Optional: Update old status values to new ones
-- Uncomment these if you want to migrate existing data:

-- UPDATE invoices SET status = 'no_payments_received'
-- WHERE status = 'sent' AND (paid_amount IS NULL OR paid_amount = 0);

-- UPDATE invoices SET status = 'paid_in_full'
-- WHERE status = 'paid';

-- UPDATE invoices SET status = 'past_due'
-- WHERE status = 'overdue';
