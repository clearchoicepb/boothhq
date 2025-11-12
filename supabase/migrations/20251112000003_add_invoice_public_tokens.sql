-- Add public token field to invoices for shareable links
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS public_token VARCHAR(64) UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_invoice_token()
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Optional: Auto-generate token for new invoices
-- (Can also be generated on-demand via API)
CREATE OR REPLACE FUNCTION set_invoice_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := generate_invoice_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_token
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION set_invoice_token();

-- Backfill tokens for existing invoices
UPDATE invoices
SET public_token = generate_invoice_token()
WHERE public_token IS NULL;
