-- Create user_integrations table for storing OAuth tokens and integration credentials
-- This allows each user to connect their own Gmail, etc.

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Integration type (gmail, outlook, twilio, etc.)
  integration_type VARCHAR(50) NOT NULL,

  -- OAuth credentials (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,

  -- Integration-specific settings
  settings JSONB DEFAULT '{}',

  -- Connection status
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one integration per user per type
  UNIQUE(user_id, integration_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_tenant_id ON user_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (users can only access their own integrations)
CREATE POLICY user_integrations_policy ON user_integrations
  FOR ALL
  USING (user_id = (auth.jwt() ->> 'sub')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_integrations IS 'Stores OAuth tokens and integration credentials for each user';
COMMENT ON COLUMN user_integrations.integration_type IS 'Type of integration: gmail, outlook, twilio, etc.';
COMMENT ON COLUMN user_integrations.settings IS 'JSON settings specific to the integration (e.g., from_email, phone_number)';