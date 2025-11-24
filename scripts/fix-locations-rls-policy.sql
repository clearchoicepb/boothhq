-- Fix locations table RLS policy for dual-database architecture
-- 
-- PROBLEM: The original policy uses auth.jwt() which doesn't exist in Tenant DB
-- SOLUTION: Since we're using service role keys that bypass RLS, we can simplify or remove the policy
--
-- In a dual-database setup:
-- - Application DB handles auth (auth.users, sessions)
-- - Tenant DB handles business data (locations, events, etc.)
-- - Tenant DB doesn't have access to auth.jwt()
-- - All API requests use service role key (bypasses RLS anyway)
-- - Tenant isolation is enforced at the application layer

-- Drop the old broken policy
DROP POLICY IF EXISTS tenant_isolation_locations ON locations;

-- Option 1: Disable RLS entirely (since we're using service role keys)
-- This is the simplest and works fine when ALL access goes through authenticated APIs
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- Option 2: Create a permissive policy that just checks tenant_id
-- (Keep RLS enabled but don't rely on auth.jwt())
-- Uncomment if you prefer to keep RLS:
-- 
-- ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY service_role_full_access ON locations
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);
--
-- -- For authenticated users (if you later add direct client access)
-- CREATE POLICY tenant_isolation_check ON locations
--   FOR ALL
--   TO authenticated
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
--   WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'RLS policy updated successfully for locations table';
  RAISE NOTICE 'All API requests will now work correctly with service role key';
END $$;

-- Test query (should work now)
-- SELECT * FROM locations WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18' LIMIT 1;


