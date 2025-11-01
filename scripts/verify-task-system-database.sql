-- ============================================================================
-- Task System Database Verification Script
-- Run this on BOTH Application DB and Tenant DB to verify setup
-- ============================================================================

-- ============================================================================
-- PART 1: Check Column Existence
-- ============================================================================

-- Check users table (Application Database)
SELECT
    'users table columns' AS check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('department', 'department_role')
ORDER BY column_name;

-- Check tasks table (Tenant Database)
SELECT
    'tasks table columns' AS check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('department', 'task_type', 'assigned_to', 'created_by', 'event_date_id')
ORDER BY column_name;

-- ============================================================================
-- PART 2: Check Foreign Key Constraints
-- ============================================================================

-- Get ALL FK constraints on tasks table
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'tasks'
ORDER BY kcu.column_name;

-- ============================================================================
-- PART 3: Check Indexes
-- ============================================================================

-- Check indexes on users table
SELECT
    'users table indexes' AS check_name,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%department%'
ORDER BY indexname;

-- Check indexes on tasks table
SELECT
    'tasks table indexes' AS check_name,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tasks'
AND (indexname LIKE '%department%' OR indexname LIKE '%task_type%')
ORDER BY indexname;

-- ============================================================================
-- PART 4: Expected Results Summary
-- ============================================================================

/*
EXPECTED RESULTS:

1. USERS TABLE COLUMNS (Application DB):
   - department (TEXT, nullable)
   - department_role (TEXT, nullable, default 'member')

2. TASKS TABLE COLUMNS (Tenant DB):
   - department (TEXT, nullable)
   - task_type (TEXT, nullable)
   - assigned_to (UUID, nullable)
   - created_by (UUID, nullable)
   - event_date_id (UUID, nullable)

3. TASKS FK CONSTRAINTS:
   We NEED to see one of these patterns:

   IDEAL (explicit names matching API):
   - tasks_assigned_to_fkey → users(id)
   - tasks_created_by_fkey → users(id)
   - tasks_event_date_id_fkey → event_dates(id)

   OR (auto-generated names):
   - tasks_assigned_to_fkey1 (or similar)
   - tasks_created_by_fkey1 (or similar)
   - tasks_event_date_id_fkey1 (or similar)

   If you see auto-generated names with numbers or suffixes,
   that's the FK constraint naming issue!

4. INDEXES:
   Users table:
   - idx_users_department
   - idx_users_department_role
   - idx_users_tenant_department

   Tasks table:
   - idx_tasks_department
   - idx_tasks_department_status
   - idx_tasks_department_assigned
   - idx_tasks_department_due_date
   - idx_tasks_task_type
*/
