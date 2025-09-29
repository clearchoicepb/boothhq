-- Check current RLS policies and their status
-- Run this in Supabase SQL Editor to see what's currently active

-- 1. Check RLS status on all tables
SELECT 'RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'tenants', 'accounts', 'contacts', 'leads', 'opportunities', 'events')
ORDER BY tablename;

-- 2. Check current policies on users and tenants tables
SELECT 'Current Policies on Users:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

SELECT 'Current Policies on Tenants:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tenants';

-- 3. Check if default data exists
SELECT 'Default Tenant Exists:' as info;
SELECT id, name, subdomain, status FROM tenants WHERE subdomain = 'default';

SELECT 'Default User Exists:' as info;
SELECT id, email, first_name, last_name, role, status FROM users WHERE email = 'admin@default.com';

-- 4. Test if we can access the data (this will show if RLS is blocking)
SELECT 'Can access tenants table:' as info;
SELECT COUNT(*) as tenant_count FROM tenants;

SELECT 'Can access users table:' as info;
SELECT COUNT(*) as user_count FROM users;
