-- Fix invoice balance_amount for all invoices
-- This script recalculates balance_amount as total_amount - paid_amount
-- Run this to fix any invoices that have incorrect balance amounts

UPDATE invoices
SET
  balance_amount = total_amount - COALESCE(paid_amount, 0),
  updated_at = NOW()
WHERE
  balance_amount != (total_amount - COALESCE(paid_amount, 0));

-- Show how many invoices were fixed
SELECT
  COUNT(*) as fixed_invoice_count
FROM invoices
WHERE balance_amount != (total_amount - COALESCE(paid_amount, 0));
