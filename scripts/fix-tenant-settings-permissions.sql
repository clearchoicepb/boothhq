-- Fix permissions for tenant_settings table in Tenant DB
-- Run this in your Tenant DB SQL Editor

-- Option 1: Temporarily disable RLS for migration (recommended)
ALTER TABLE tenant_settings DISABLE ROW LEVEL SECURITY;

-- After running this, run: node scripts/migrate-settings-simple.js
-- Then re-enable RLS with: ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- OR

-- Option 2: Add a permissive policy for service role
-- (Keep this commented out unless you prefer this approach)
/*
CREATE POLICY tenant_settings_service_role_access ON tenant_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
*/

-- To check current policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'tenant_settings';

-- To check if RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tenant_settings';

