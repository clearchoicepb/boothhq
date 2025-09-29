-- Check the current schema of all tables
-- Run this in Supabase SQL Editor to see what columns actually exist

-- Check users table schema
SELECT 'users' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check tenants table schema
SELECT 'tenants' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if any tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

