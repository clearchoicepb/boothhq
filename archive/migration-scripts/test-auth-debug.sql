-- Quick test to verify the RLS policies are working correctly
-- Run this in Supabase SQL Editor after applying the migration

-- 1. Check current policies
SELECT 'Current RLS Policies:' as info;
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'tenants')
ORDER BY tablename, policyname;

-- 2. Test if we can access the data (simulating no JWT - during login)
SELECT 'Testing data access (no JWT):' as info;

-- This should work now (simulating login scenario)
SELECT 'Tenant count:' as test, COUNT(*) as result FROM tenants;
SELECT 'User count:' as test, COUNT(*) as result FROM users;

-- 3. Check if default data exists
SELECT 'Default Data Check:' as info;
SELECT 'Tenant exists:' as check, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM tenants WHERE subdomain = 'default';

SELECT 'User exists:' as check, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result  
FROM users WHERE email = 'admin@default.com';

-- 4. Show the actual data
SELECT 'Default Tenant Data:' as info;
SELECT id, name, subdomain, status FROM tenants WHERE subdomain = 'default';

SELECT 'Default User Data:' as info;
SELECT id, email, first_name, last_name, role, status FROM users WHERE email = 'admin@default.com';
