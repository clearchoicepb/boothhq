-- Diagnose current schema to understand what exists
-- Run this in Supabase SQL Editor first

-- 1. Check what tables exist
SELECT 'Tables that exist:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check users table schema
SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check tenants table schema
SELECT 'Tenants table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if RLS is enabled on any tables
SELECT 'RLS status:' as info;
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'tenants', 'accounts', 'contacts', 'leads', 'opportunities', 'events')
ORDER BY tablename;

-- 5. Check existing policies
SELECT 'Existing policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

