-- Diagnostic: Check Projects Table and RLS Setup
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if projects table exists and its structure
SELECT 
  'Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('projects', 'project_team_members');

-- 3. Check existing RLS policies
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename IN ('projects', 'project_team_members')
ORDER BY tablename, policyname;

-- 4. Check foreign key constraints
SELECT
  'Foreign Keys' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('projects', 'project_team_members')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Try a test insert (will show the actual error)
DO $$
BEGIN
  -- This will fail but show us the exact error
  INSERT INTO projects (
    tenant_id,
    name,
    status,
    priority,
    progress_percentage
  ) VALUES (
    '5f98f4c0-5254-4c61-8633-55ea049c7f18'::uuid,
    'Test Project',
    'not_started',
    'medium',
    0
  );
  
  RAISE NOTICE 'Test insert succeeded!';
  
  -- Clean up
  DELETE FROM projects WHERE name = 'Test Project';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

