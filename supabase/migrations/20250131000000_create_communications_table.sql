-- Create communications table for tracking all client communications
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Communication details
  communication_type VARCHAR(50) NOT NULL, -- email, sms, phone, in_person, other
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  subject VARCHAR(255),
  notes TEXT,

  -- Status tracking (for automated communications)
  status VARCHAR(50) DEFAULT 'logged', -- logged, sent, delivered, read, replied, failed

  -- Metadata for tracking external IDs (email service, SMS service, etc.)
  metadata JSONB,

  -- Timestamps
  communication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_communications_tenant_id ON communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communications_opportunity_id ON communications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_communications_account_id ON communications(account_id);
CREATE INDEX IF NOT EXISTS idx_communications_contact_id ON communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_communication_date ON communications(communication_date DESC);

-- Enable RLS
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_communications ON communications
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE communications IS 'Tracks all communications with clients (email, SMS, phone, in-person, etc.)';
COMMENT ON COLUMN communications.communication_type IS 'Type: email, sms, phone, in_person, other';
COMMENT ON COLUMN communications.direction IS 'Direction: inbound, outbound';
COMMENT ON COLUMN communications.status IS 'Status: logged, sent, delivered, read, replied, failed';
COMMENT ON COLUMN communications.metadata IS 'JSON metadata for tracking external service IDs, email/SMS IDs, etc.';
