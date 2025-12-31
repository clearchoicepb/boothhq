-- Add include_invoice_attachment column to templates table
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS include_invoice_attachment BOOLEAN DEFAULT FALSE;

-- Add include_invoice_attachment column to contracts table
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS include_invoice_attachment BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN templates.include_invoice_attachment IS 'When true, generated agreements will append invoice PDFs as Schedule A';
COMMENT ON COLUMN contracts.include_invoice_attachment IS 'Copied from template setting - indicates invoice PDFs should be attached';
