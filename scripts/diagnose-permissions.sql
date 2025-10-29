-- Diagnose and fix tenant_settings permissions
-- Run this in your Tenant DB SQL Editor

-- 1. Check if table exists and its owner
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_enabled,
    hasindexes,
    hastriggers
FROM pg_tables 
WHERE tablename = 'tenant_settings';

-- 2. Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'tenant_settings';

-- 3. Check table privileges
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'tenant_settings';

-- 4. FIXES - Run these to resolve permissions:

-- Fix 1: Disable RLS temporarily
ALTER TABLE tenant_settings DISABLE ROW LEVEL SECURITY;

-- Fix 2: Grant all permissions to authenticated and service roles
GRANT ALL ON tenant_settings TO authenticated;
GRANT ALL ON tenant_settings TO service_role;
GRANT ALL ON tenant_settings TO postgres;

-- Fix 3: Make sure the table is owned by postgres (or your service role)
ALTER TABLE tenant_settings OWNER TO postgres;

-- After running the migration script successfully, re-enable RLS:
-- ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

