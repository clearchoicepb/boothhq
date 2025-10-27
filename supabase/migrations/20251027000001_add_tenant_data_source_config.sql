-- Migration: Add data source configuration to tenants table
-- Purpose: Enable separate tenant data databases while keeping application metadata centralized
--
-- Architecture:
-- - Application DB (this database): tenants, users, audit_log (metadata only)
-- - Tenant Data DBs (separate): all business data (accounts, contacts, events, opportunities, etc.)
--
-- This migration adds columns to store connection information for each tenant's data database

-- Add connection string configuration columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS data_source_url TEXT,
  ADD COLUMN IF NOT EXISTS data_source_anon_key TEXT,
  ADD COLUMN IF NOT EXISTS data_source_service_key TEXT,
  ADD COLUMN IF NOT EXISTS data_source_region TEXT,
  ADD COLUMN IF NOT EXISTS connection_pool_config JSONB DEFAULT '{"min": 2, "max": 10}'::jsonb,
  ADD COLUMN IF NOT EXISTS data_source_notes TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id_in_data_source TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tenants.data_source_url IS 'Supabase URL or PostgreSQL connection string for tenant data (encrypted in production)';
COMMENT ON COLUMN tenants.data_source_anon_key IS 'Encrypted anon key for Supabase tenant data database';
COMMENT ON COLUMN tenants.data_source_service_key IS 'Encrypted service role key for Supabase tenant data database';
COMMENT ON COLUMN tenants.data_source_region IS 'Database region (e.g., us-east-1, eu-west-1)';
COMMENT ON COLUMN tenants.connection_pool_config IS 'Connection pool configuration (min, max connections)';
COMMENT ON COLUMN tenants.data_source_notes IS 'Additional notes about this tenants data source configuration';
COMMENT ON COLUMN tenants.tenant_id_in_data_source IS 'The tenant_id value used in the tenant data database (may differ from this application tenant id)';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_data_source_url
  ON tenants(data_source_url)
  WHERE data_source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_region
  ON tenants(data_source_region)
  WHERE data_source_region IS NOT NULL;

-- Add check constraint to ensure connection info is complete
ALTER TABLE tenants
  ADD CONSTRAINT check_data_source_complete
  CHECK (
    (data_source_url IS NULL AND data_source_anon_key IS NULL AND data_source_service_key IS NULL)
    OR
    (data_source_url IS NOT NULL AND data_source_anon_key IS NOT NULL AND data_source_service_key IS NOT NULL)
  );

-- Create audit trigger for connection string changes (security)
CREATE OR REPLACE FUNCTION audit_tenant_data_source_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    OLD.data_source_url IS DISTINCT FROM NEW.data_source_url OR
    OLD.data_source_anon_key IS DISTINCT FROM NEW.data_source_anon_key OR
    OLD.data_source_service_key IS DISTINCT FROM NEW.data_source_service_key
  )) THEN
    INSERT INTO audit_log (
      tenant_id,
      user_id,
      action,
      entity_type,
      entity_id,
      changes,
      ip_address,
      user_agent
    ) VALUES (
      NEW.id,
      current_setting('app.current_user_id', true)::uuid,
      'data_source_updated',
      'tenant',
      NEW.id,
      jsonb_build_object(
        'previous_url', OLD.data_source_url,
        'new_url', NEW.data_source_url,
        'previous_region', OLD.data_source_region,
        'new_region', NEW.data_source_region
      ),
      current_setting('app.client_ip', true),
      current_setting('app.user_agent', true)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_tenant_data_source
  AFTER UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION audit_tenant_data_source_changes();

-- Example: Set default data source for existing tenants
-- Uncomment and modify these lines when ready to set a default tenant data database
--
-- UPDATE tenants
-- SET
--   data_source_url = 'https://your-default-tenant-data.supabase.co',
--   data_source_anon_key = 'your-encrypted-anon-key',
--   data_source_service_key = 'your-encrypted-service-key',
--   data_source_region = 'us-east-1',
--   tenant_id_in_data_source = id::text
-- WHERE data_source_url IS NULL;
