-- ============================================
-- Create design_proofs table for client approval workflow
-- Enables design team to upload proofs for client approval via public URL
-- ============================================

CREATE TABLE IF NOT EXISTS design_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,

  -- Public access
  public_token VARCHAR(64) UNIQUE NOT NULL,

  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,

  -- Client response
  client_name VARCHAR(255),
  client_notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_design_proofs_event_id ON design_proofs(event_id);
CREATE INDEX IF NOT EXISTS idx_design_proofs_public_token ON design_proofs(public_token);
CREATE INDEX IF NOT EXISTS idx_design_proofs_tenant_id ON design_proofs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_design_proofs_status ON design_proofs(status);
CREATE INDEX IF NOT EXISTS idx_design_proofs_uploaded_at ON design_proofs(uploaded_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE design_proofs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DROP POLICY IF EXISTS design_proofs_tenant_isolation ON design_proofs;
CREATE POLICY design_proofs_tenant_isolation ON design_proofs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on changes
DROP TRIGGER IF EXISTS update_design_proofs_updated_at ON design_proofs;
CREATE TRIGGER update_design_proofs_updated_at
  BEFORE UPDATE ON design_proofs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE design_proofs IS 'Design proofs uploaded for client approval via public URL';
COMMENT ON COLUMN design_proofs.public_token IS '64-character hex token for public access';
COMMENT ON COLUMN design_proofs.status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN design_proofs.viewed_at IS 'Timestamp when client first viewed the proof';
COMMENT ON COLUMN design_proofs.responded_at IS 'Timestamp when client approved/rejected';
COMMENT ON COLUMN design_proofs.client_name IS 'Name provided by client when responding';
COMMENT ON COLUMN design_proofs.client_notes IS 'Notes/feedback from client (required for rejection)';
