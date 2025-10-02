-- Create attachments table for storing file metadata
-- Files are stored in Supabase Storage, metadata tracked here

CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Polymorphic relationship
  entity_type TEXT NOT NULL CHECK (entity_type IN ('opportunity', 'account', 'contact', 'lead', 'invoice', 'event')),
  entity_id UUID NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- in bytes
  file_type TEXT NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- path in Supabase Storage

  -- Optional metadata
  description TEXT,

  -- Audit fields
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX idx_attachments_created_at ON attachments(created_at DESC);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_attachments ON attachments
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE attachments IS 'File attachments for various entities';
COMMENT ON COLUMN attachments.entity_type IS 'Type of entity: opportunity, account, contact, lead, invoice, event';
COMMENT ON COLUMN attachments.entity_id IS 'UUID of the related entity';
COMMENT ON COLUMN attachments.storage_path IS 'Path to file in Supabase Storage bucket';

-- Create storage bucket for attachments (if it doesn't exist)
-- This will be created via Supabase Dashboard or API
-- Bucket name: 'attachments'
-- Public: false (requires authentication)
