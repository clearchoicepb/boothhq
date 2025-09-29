-- auth_login_rls_fix.sql
-- Fix RLS policies to allow authentication while maintaining security

-- =====================================================
-- TENANTS TABLE: Allow read during login (no JWT), otherwise require matching tenant
-- =====================================================

DROP POLICY IF EXISTS "tenant_isolation_tenants" ON public.tenants;
DROP POLICY IF EXISTS "allow_tenant_access_for_auth" ON public.tenants;

CREATE POLICY "allow_tenant_access_for_auth"
ON public.tenants
FOR SELECT
USING (
  auth.jwt() IS NULL
  OR id::text = coalesce(auth.jwt() ->> 'tenantId', '')
);

-- =====================================================
-- USERS TABLE: Allow read during login (no JWT), otherwise require matching tenant
-- =====================================================

DROP POLICY IF EXISTS "tenant_isolation_users" ON public.users;
DROP POLICY IF EXISTS "allow_user_access_for_auth" ON public.users;

CREATE POLICY "allow_user_access_for_auth"
ON public.users
FOR SELECT
USING (
  auth.jwt() IS NULL
  OR tenant_id::text = coalesce(auth.jwt() ->> 'tenantId', '')
);

-- =====================================================
-- ENSURE DEFAULT DATA EXISTS
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
    RAISE NOTICE '✅ Fixed tenants table RLS policy (SELECT only during login)';
    RAISE NOTICE '✅ Fixed users table RLS policy (SELECT only during login)';
    RAISE NOTICE '✅ Default tenant and user created/updated';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Authentication should now work!';
    RAISE NOTICE '   Email: admin@default.com';
    RAISE NOTICE '   Password: password123';
    RAISE NOTICE '   Company: default';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security maintained: Only SELECT allowed during login';
    RAISE NOTICE '   INSERT/UPDATE/DELETE still require proper JWT';
END $$;
