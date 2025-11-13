-- Recalculate all invoice balances based on actual payments
-- This fixes invoices where paid_amount and balance_amount are out of sync
-- (e.g., payments added before automatic recalculation was implemented)

-- Update all invoices with correct paid_amount and balance_amount
UPDATE invoices i
SET
  paid_amount = COALESCE(
    (SELECT SUM(p.amount)
     FROM payments p
     WHERE p.invoice_id = i.id
     AND p.status = 'completed'
     AND p.tenant_id = i.tenant_id),
    0
  ),
  balance_amount = i.total_amount - COALESCE(
    (SELECT SUM(p.amount)
     FROM payments p
     WHERE p.invoice_id = i.id
     AND p.status = 'completed'
     AND p.tenant_id = i.tenant_id),
    0
  ),
  status = CASE
    -- If balance is 0 or negative, mark as paid in full
    WHEN i.total_amount - COALESCE(
      (SELECT SUM(p.amount)
       FROM payments p
       WHERE p.invoice_id = i.id
       AND p.status = 'completed'
       AND p.tenant_id = i.tenant_id),
      0
    ) <= 0 THEN 'paid_in_full'
    -- If some payments exist but balance remains, mark as partially paid
    WHEN COALESCE(
      (SELECT SUM(p.amount)
       FROM payments p
       WHERE p.invoice_id = i.id
       AND p.status = 'completed'
       AND p.tenant_id = i.tenant_id),
      0
    ) > 0 THEN 'partially_paid'
    -- If no payments, mark as no_payments_received
    ELSE 'no_payments_received'
  END,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM payments p
  WHERE p.invoice_id = i.id
);

-- Create a view for invoice balance verification (useful for debugging)
CREATE OR REPLACE VIEW invoice_balance_check AS
SELECT
  i.id,
  i.invoice_number,
  i.total_amount,
  i.paid_amount as stored_paid_amount,
  i.balance_amount as stored_balance_amount,
  i.status,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as calculated_paid_amount,
  i.total_amount - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as calculated_balance_amount,
  -- Show if there's a mismatch
  CASE
    WHEN ABS(i.paid_amount - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)) > 0.01
    THEN 'MISMATCH'
    ELSE 'OK'
  END as balance_status
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.total_amount, i.paid_amount, i.balance_amount, i.status
ORDER BY i.created_at DESC;

COMMENT ON VIEW invoice_balance_check IS 'Diagnostic view to check if invoice paid/balance amounts match actual payments. Use this to find invoices with incorrect balances.';

-- Add helpful comment
COMMENT ON TABLE invoices IS 'Invoice records with automatic balance tracking. paid_amount and balance_amount are automatically recalculated when payments are added/edited/deleted.';
