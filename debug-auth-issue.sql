-- Quick diagnostic to identify the exact authentication issue
-- Run this in Supabase SQL Editor to see what's blocking authentication

-- 1. Check if RLS is enabled and what policies exist
SELECT 'RLS Status and Policies:' as info;
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    p.policyname,
    p.cmd,
    p.qual
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename IN ('users', 'tenants')
ORDER BY t.tablename, p.policyname;

-- 2. Test if we can access the data (this will show if RLS is blocking)
SELECT 'Testing Data Access:' as info;

-- Test tenant access
SELECT 'Tenant count:' as test, COUNT(*) as result FROM tenants;

-- Test user access  
SELECT 'User count:' as test, COUNT(*) as result FROM users;

-- 3. Check if default data exists
SELECT 'Default Data Check:' as info;
SELECT 'Tenant exists:' as check, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM tenants WHERE subdomain = 'default';

SELECT 'User exists:' as check, CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result  
FROM users WHERE email = 'admin@default.com';

-- 4. Check column names in users table (in case there's a mismatch)
SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
