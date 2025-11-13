-- Diagnostic query to check payments table RLS status
-- Run this in your Supabase SQL Editor to see the current state

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'payments';

-- Check what policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'payments';

-- Try to check service role permissions
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'payments'
AND grantee != 'postgres';
