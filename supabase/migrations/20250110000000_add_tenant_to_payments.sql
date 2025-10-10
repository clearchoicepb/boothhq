-- Add tenant_id to payments table for proper multi-tenant isolation
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Populate tenant_id from the related invoice
UPDATE payments p
SET tenant_id = i.tenant_id
FROM invoices i
WHERE p.invoice_id = i.id
AND p.tenant_id IS NULL;

-- Make tenant_id NOT NULL after populating existing data
ALTER TABLE payments
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);

-- Verify the update
-- SELECT p.id, p.tenant_id, i.tenant_id as invoice_tenant_id
-- FROM payments p
-- JOIN invoices i ON p.invoice_id = i.id
-- LIMIT 10;
