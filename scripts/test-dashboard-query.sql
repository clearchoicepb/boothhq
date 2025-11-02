-- ============================================================================
-- Test Dashboard Query
-- This mimics what the /api/tasks/dashboard endpoint does
-- Run this on your TENANT DATABASE
-- ============================================================================

-- ============================================================================
-- TEST 1: Simple query without joins (should work if columns exist)
-- ============================================================================
SELECT
    id,
    title,
    department,
    task_type,
    assigned_to,
    created_by,
    status,
    priority,
    due_date
FROM tasks
WHERE department = 'design'  -- Change to your department
AND status IN ('pending', 'in_progress')
LIMIT 5;

-- If this works, columns exist ✅
-- If this fails with "column does not exist", migration didn't apply ❌

-- ============================================================================
-- TEST 2: Query with FK hint syntax (what the API actually uses)
-- ============================================================================

-- This is EXACTLY what the API code does:
-- assigned_user:users!tasks_assigned_to_fkey(...)

-- First, let's see what FK constraint names actually exist:
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'tasks'
AND constraint_type = 'FOREIGN KEY';

-- Now try the query with FK hint syntax
-- REPLACE 'tasks_assigned_to_fkey' with the actual constraint name from above!

/*
-- Example with expected constraint names:
SELECT
    tasks.*,
    assigned_user.first_name,
    assigned_user.last_name,
    created_user.first_name as creator_first_name
FROM tasks
LEFT JOIN users AS assigned_user
    ON tasks.assigned_to = assigned_user.id
LEFT JOIN users AS created_user
    ON tasks.created_by = created_user.id
WHERE tasks.department = 'design'
AND tasks.status IN ('pending', 'in_progress')
LIMIT 5;
*/

-- ============================================================================
-- TEST 3: Check if Supabase PostgREST can find the FK constraints
-- ============================================================================

-- This query shows if the constraint names match what Supabase expects
SELECT
    tc.constraint_name,
    CASE
        WHEN tc.constraint_name = 'tasks_assigned_to_fkey' THEN '✅ MATCHES API expectation'
        WHEN tc.constraint_name LIKE 'tasks_assigned_to%' THEN '⚠️  Similar but different: ' || tc.constraint_name
        ELSE '❌ Wrong name'
    END as status_assigned_to,
    CASE
        WHEN tc.constraint_name = 'tasks_created_by_fkey' THEN '✅ MATCHES API expectation'
        WHEN tc.constraint_name LIKE 'tasks_created_by%' THEN '⚠️  Similar but different: ' || tc.constraint_name
        ELSE '❌ Wrong name'
    END as status_created_by,
    CASE
        WHEN tc.constraint_name = 'tasks_event_date_id_fkey' THEN '✅ MATCHES API expectation'
        WHEN tc.constraint_name LIKE 'tasks_event_date%' THEN '⚠️  Similar but different: ' || tc.constraint_name
        ELSE '❌ Wrong name'
    END as status_event_date,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tasks'
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name IN ('assigned_to', 'created_by', 'event_date_id');

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================

/*
IF you see:
✅ "MATCHES API expectation" → Good! FK names are correct
⚠️  "Similar but different" → FK exists but name is wrong (the issue!)
❌ "Wrong name" or no results → FK doesn't exist at all

NEXT STEPS based on results:

1. If all ✅:
   - Try accessing the dashboard
   - Should work now!

2. If all ⚠️ (similar but different):
   - You have the FK constraint naming issue
   - Need to run the fix migration to rename constraints
   - OR update API code to use actual names

3. If ❌ (no FK constraints):
   - Original task migration didn't create FKs
   - Need to add them with correct names
*/

-- ============================================================================
-- TEST 4: Sample data check
-- ============================================================================

-- How many tasks exist in each department?
SELECT
    department,
    COUNT(*) as task_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
FROM tasks
GROUP BY department
ORDER BY department;

-- Are there any users with departments assigned?
SELECT
    department,
    department_role,
    COUNT(*) as user_count
FROM users
WHERE department IS NOT NULL
GROUP BY department, department_role
ORDER BY department, department_role;
