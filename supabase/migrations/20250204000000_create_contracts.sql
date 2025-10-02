-- Create contracts table for tracking generated and sent contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Related entities (at least one should be set)
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Template reference
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  template_name VARCHAR(255), -- Snapshot of template name at time of generation

  -- Contract content
  contract_number VARCHAR(50) UNIQUE, -- e.g., "CONTRACT-2025-001"
  content TEXT NOT NULL, -- Contract content with merge fields filled in

  -- Recipient info
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired')),

  -- Important dates
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Signature tracking
  signature_data TEXT, -- Base64 encoded signature or signature file path
  signed_by VARCHAR(255), -- Name of person who signed
  ip_address VARCHAR(45), -- IP address of signer for audit trail

  -- Notes and comments
  notes TEXT,

  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX idx_contracts_opportunity_id ON contracts(opportunity_id);
CREATE INDEX idx_contracts_account_id ON contracts(account_id);
CREATE INDEX idx_contracts_contact_id ON contracts(contact_id);
CREATE INDEX idx_contracts_lead_id ON contracts(lead_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation_contracts ON contracts
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE contracts IS 'Track generated and sent contracts with status and signature information';
COMMENT ON COLUMN contracts.contract_number IS 'Unique contract identifier like CONTRACT-2025-001';
COMMENT ON COLUMN contracts.content IS 'Full contract text with merge fields populated';
COMMENT ON COLUMN contracts.status IS 'Current status: draft, sent, viewed, signed, declined, expired';
COMMENT ON COLUMN contracts.signature_data IS 'Base64 encoded signature image or file path';
COMMENT ON COLUMN contracts.ip_address IS 'IP address of person who signed for audit trail';

-- Create function to generate contract numbers
CREATE OR REPLACE FUNCTION generate_contract_number(p_tenant_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_count INTEGER;
  v_contract_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get count of contracts for this tenant this year
  SELECT COUNT(*) + 1 INTO v_count
  FROM contracts
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Format: CONTRACT-YYYY-NNN
  v_contract_number := 'CONTRACT-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');

  RETURN v_contract_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_contract_number IS 'Generates sequential contract numbers like CONTRACT-2025-001';
