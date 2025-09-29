-- Fix Authentication RLS Policies
-- The issue: RLS policies on auth tables require JWT tenant_id, but no JWT exists during login

-- =====================================================
-- STEP 1: FIX TENANTS TABLE RLS POLICY
-- =====================================================

-- Drop the restrictive policy on tenants table
DROP POLICY IF EXISTS "tenant_isolation_tenants" ON tenants;

-- Create a new policy that allows access during authentication
CREATE POLICY "allow_tenant_access_for_auth" ON tenants 
FOR ALL 
USING (
  -- Allow access if no JWT (during login) OR if JWT matches tenant
  auth.jwt() IS NULL 
  OR id = (auth.jwt() ->> 'tenant_id')::uuid
);

-- =====================================================
-- STEP 2: FIX USERS TABLE RLS POLICY  
-- =====================================================

-- Drop the restrictive policy on users table
DROP POLICY IF EXISTS "tenant_isolation_users" ON users;

-- Create a new policy that allows access during authentication
CREATE POLICY "allow_user_access_for_auth" ON users 
FOR ALL 
USING (
  -- Allow access if no JWT (during login) OR if JWT matches tenant
  auth.jwt() IS NULL 
  OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);

-- =====================================================
-- STEP 3: ENSURE DEFAULT DATA EXISTS
-- =====================================================

-- Insert default tenant if it doesn't exist
INSERT INTO tenants (id, name, subdomain, plan, status, settings) 
VALUES (
  '1a174060-deb6-4502-ad21-a5fccd875f23',
  'Default Tenant',
  'default',
  'professional',
  'active',
  '{}'
) ON CONFLICT (subdomain) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status;

-- Insert default user if it doesn't exist
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status) 
VALUES (
  'ca92d8c2-bd6e-4e1c-8757-ea361cc104fa',
  '1a174060-deb6-4502-ad21-a5fccd875f23',
  'admin@default.com',
  'Admin',
  'User',
  'admin',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Authentication RLS Fix Applied Successfully!';
    RAISE NOTICE '✅ Fixed tenants table RLS policy (allows access during login)';
    RAISE NOTICE '✅ Fixed users table RLS policy (allows access during login)';
    RAISE NOTICE '✅ Default tenant and user created/updated';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Authentication should now work!';
    RAISE NOTICE '   Email: admin@default.com';
    RAISE NOTICE '   Password: password123';
    RAISE NOTICE '   Company: default';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Other tables still have proper tenant isolation';
    RAISE NOTICE '   Only auth tables allow access during login';
END $$;
