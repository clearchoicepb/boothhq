-- Create contracts table for e-signature agreements
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Linked entities
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Contract details
  contract_number TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- The agreement content with merge fields replaced
  template_id UUID, -- Reference to the template used
  
  -- Signature information
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired')),
  signer_name TEXT,
  signer_email TEXT,
  signature_data TEXT, -- The typed name that was signed
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_ip TEXT, -- IP address of signer
  signature_user_agent TEXT, -- Browser info
  
  -- PDF storage
  pdf_url TEXT, -- Unsigned PDF
  signed_pdf_url TEXT, -- Signed PDF
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_event_id ON contracts(event_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contact_id ON contracts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS tenant_isolation_contracts ON contracts;
CREATE POLICY tenant_isolation_contracts ON contracts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE contracts IS 'Electronically signed contracts and agreements';
COMMENT ON COLUMN contracts.content IS 'Agreement content with merge fields replaced';
COMMENT ON COLUMN contracts.signature_data IS 'The name typed by the signer';
COMMENT ON COLUMN contracts.signed_ip IS 'IP address captured at time of signature';
COMMENT ON COLUMN contracts.status IS 'draft, sent, viewed, signed, declined, expired';

