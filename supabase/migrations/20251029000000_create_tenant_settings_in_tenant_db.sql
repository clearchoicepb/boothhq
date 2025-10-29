-- Create tenant_settings table in TENANT DATABASE
-- Run this in your TENANT DATABASE (not Application DB)

-- This table was missing from the tenant DB after dual database migration
-- It stores all tenant-specific configuration including custom opportunity stages

CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, setting_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id
  ON tenant_settings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_key
  ON tenant_settings(tenant_id, setting_key);

-- Enable Row Level Security
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenants can only access their own settings
-- This uses the app.current_tenant_id set by getTenantDatabaseClient()
CREATE POLICY tenant_settings_tenant_isolation ON tenant_settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Add comment
COMMENT ON TABLE tenant_settings IS 'Stores tenant-specific configuration and settings including custom opportunity stages';
COMMENT ON COLUMN tenant_settings.setting_key IS 'Dot-notation key (e.g., opportunities.stages.0.name)';
COMMENT ON COLUMN tenant_settings.setting_value IS 'JSONB value for flexibility';
