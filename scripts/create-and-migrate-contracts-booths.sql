-- ============================================================================
-- CREATE AND MIGRATE CONTRACTS AND BOOTHS TO TENANT DB
-- ============================================================================
-- Run this SQL in your TENANT DB SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE CONTRACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Related entities
  opportunity_id UUID,
  account_id UUID,
  contact_id UUID,
  lead_id UUID,

  -- Template reference
  template_id UUID,
  template_name VARCHAR(255),

  -- Contract content
  contract_number VARCHAR(50) UNIQUE,
  content TEXT NOT NULL,

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
  signature_data TEXT,
  signed_by VARCHAR(255),
  ip_address VARCHAR(45),

  -- Notes and comments
  notes TEXT,

  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_opportunity_id ON contracts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contact_id ON contracts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lead_id ON contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- ============================================================================
-- STEP 2: CREATE BOOTHS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Identity
  booth_name VARCHAR(255) NOT NULL,
  booth_type VARCHAR(50) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'ready',

  -- Current deployment
  assigned_to_event_id UUID,
  assigned_to_user_id UUID,
  deployed_date TIMESTAMPTZ,

  -- Required equipment template (JSONB)
  required_items JSONB DEFAULT '{}',

  -- Configuration
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Status tracking
  is_complete BOOLEAN DEFAULT false,
  last_deployed_date TIMESTAMPTZ,

  -- Optional
  image_url TEXT,
  qr_code TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  UNIQUE(tenant_id, booth_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booths_tenant ON booths(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booths_status ON booths(status);
CREATE INDEX IF NOT EXISTS idx_booths_type ON booths(booth_type);
CREATE INDEX IF NOT EXISTS idx_booths_event ON booths(assigned_to_event_id);
CREATE INDEX IF NOT EXISTS idx_booths_active ON booths(is_active);

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON contracts TO authenticated;
GRANT ALL ON contracts TO service_role;
GRANT ALL ON contracts TO postgres;

GRANT ALL ON booths TO authenticated;
GRANT ALL ON booths TO service_role;
GRANT ALL ON booths TO postgres;

-- ============================================================================
-- STEP 4: INSERT DATA
-- ============================================================================

-- Insert contracts (1 record)
INSERT INTO contracts (
  id, tenant_id, opportunity_id, account_id, contact_id, lead_id, 
  template_id, template_name, contract_number, content, 
  recipient_email, recipient_name, status, sent_at, viewed_at, 
  signed_at, declined_at, expires_at, signature_data, signed_by, 
  ip_address, notes, created_by, created_at, updated_at
)
VALUES (
  '18ed5e83-2320-4319-aa58-714dabffb8ae',
  '5f98f4c0-5254-4c61-8633-55ea049c7f18',
  NULL, NULL, NULL, NULL,
  '1127c0a6-ca99-4f52-b2b7-073a7e55cb47',
  'Test Contract',
  'CONTRACT-2025-001',
  'This is a test


testknghobrathtesttesting testin',
  'dhobraht@testing.com',
  'test testknghobrath',
  'draft',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  'fcb7ec1f-7599-4ec2-893a-bef11b30a32e',
  '2025-10-02T21:13:21.92869+00:00',
  '2025-10-15T15:34:45.810101+00:00'
)
ON CONFLICT (id) DO NOTHING;

-- Insert booths (1 record)
INSERT INTO booths (
  id, tenant_id, booth_name, booth_type, status, 
  assigned_to_event_id, assigned_to_user_id, deployed_date, 
  required_items, description, notes, is_active, is_complete, 
  last_deployed_date, image_url, qr_code, 
  created_at, updated_at, created_by
)
VALUES (
  '8457d37d-0811-4729-ab39-9db43710f805',
  '5f98f4c0-5254-4c61-8633-55ea049c7f18',
  'Photo Spot Pro',
  'standard',
  'incomplete',
  NULL, NULL, NULL,
  '{"ipad":1,"camera":1}'::jsonb,
  '',
  '',
  true,
  false,
  NULL, NULL, NULL,
  '2025-10-05T23:50:29.571386+00:00',
  '2025-10-05T23:50:29.571386+00:00',
  'fcb7ec1f-7599-4ec2-893a-bef11b30a32e'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS (after data is inserted)
-- ============================================================================

-- Add FK to events for booths
ALTER TABLE booths
  DROP CONSTRAINT IF EXISTS booths_assigned_to_event_id_fkey;

ALTER TABLE booths
  ADD CONSTRAINT booths_assigned_to_event_id_fkey
  FOREIGN KEY (assigned_to_event_id)
  REFERENCES events(id)
  ON DELETE SET NULL;

-- Add FKs for contracts
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_opportunity_id_fkey;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_opportunity_id_fkey
  FOREIGN KEY (opportunity_id)
  REFERENCES opportunities(id)
  ON DELETE SET NULL;

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_account_id_fkey;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES accounts(id)
  ON DELETE SET NULL;

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_contact_id_fkey;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_contact_id_fkey
  FOREIGN KEY (contact_id)
  REFERENCES contacts(id)
  ON DELETE SET NULL;

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_lead_id_fkey;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_lead_id_fkey
  FOREIGN KEY (lead_id)
  REFERENCES leads(id)
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 6: RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================================================

-- Check row counts
SELECT 'contracts' as table_name, COUNT(*) as count FROM contracts
UNION ALL
SELECT 'booths', COUNT(*) FROM booths;

-- Show the migrated data
SELECT * FROM contracts;
SELECT * FROM booths;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

