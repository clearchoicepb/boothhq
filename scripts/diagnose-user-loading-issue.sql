-- Diagnostic Script: User Loading Issue
-- Run this against the TENANT DATA database to investigate why specific users can't load tasks/projects
--
-- Issue: Single user (Raphael@ClearChoicePhotos.Com) cannot load "My Tasks" or "Projects" pages
-- while other users in the same tenant work fine.

-- ============================================================================
-- STEP 1: Find the affected user and compare with working user
-- ============================================================================

-- Find affected user
SELECT
    'AFFECTED USER' as user_type,
    id,
    email,
    tenant_id,
    first_name,
    last_name,
    role,
    status,
    department,      -- Legacy single department (TEXT)
    departments,     -- New multi-department support (TEXT[])
    manager_of_departments,  -- Departments where user is manager (TEXT[])
    department_role,
    created_at,
    last_login
FROM users
WHERE LOWER(email) = LOWER('Raphael@ClearChoicePhotos.Com');

-- Find working user for comparison
SELECT
    'WORKING USER' as user_type,
    id,
    email,
    tenant_id,
    first_name,
    last_name,
    role,
    status,
    department,
    departments,
    manager_of_departments,
    department_role,
    created_at,
    last_login
FROM users
WHERE LOWER(email) = LOWER('david@clearchoicephotos.com');

-- ============================================================================
-- STEP 2: Check if tenant_id matches for both users
-- ============================================================================

-- Get distinct tenant_ids in users table (for ClearChoice users)
SELECT DISTINCT tenant_id, COUNT(*) as user_count
FROM users
WHERE LOWER(email) LIKE '%clearchoicephotos.com%'
GROUP BY tenant_id;

-- ============================================================================
-- STEP 3: Check tenant configuration in APP database
-- ============================================================================
-- NOTE: Run this query against the APPLICATION database, not tenant data
--
-- SELECT id, name, subdomain, tenant_id_in_data_source
-- FROM tenants
-- WHERE name LIKE '%Clear%' OR subdomain LIKE '%clear%';

-- ============================================================================
-- STEP 4: Check if affected user has tasks assigned
-- ============================================================================

-- Get affected user's ID first, then check tasks
SELECT
    t.id as task_id,
    t.title,
    t.status,
    t.department,
    t.assigned_to,
    t.created_at,
    u.email as assigned_to_email
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.assigned_to IN (
    SELECT id FROM users WHERE LOWER(email) = LOWER('Raphael@ClearChoicePhotos.Com')
)
LIMIT 20;

-- ============================================================================
-- STEP 5: Verify all required columns exist and have proper defaults
-- ============================================================================

-- Check for NULL values in critical columns for this tenant
SELECT
    id,
    email,
    CASE WHEN department IS NULL THEN 'NULL' ELSE 'HAS VALUE' END as department_status,
    CASE WHEN departments IS NULL THEN 'NULL'
         WHEN departments = '{}' THEN 'EMPTY ARRAY'
         ELSE 'HAS VALUES' END as departments_status,
    CASE WHEN manager_of_departments IS NULL THEN 'NULL'
         WHEN manager_of_departments = '{}' THEN 'EMPTY ARRAY'
         ELSE 'HAS VALUES' END as manager_depts_status
FROM users
WHERE LOWER(email) LIKE '%clearchoicephotos.com%';

-- ============================================================================
-- STEP 6: Fix NULL departments arrays (if this is the issue)
-- ============================================================================

-- PREVIEW: What would be updated
SELECT
    id,
    email,
    department,
    departments,
    'Would set departments to {}' as proposed_fix
FROM users
WHERE departments IS NULL;

-- ACTUAL FIX (uncomment to run):
-- UPDATE users
-- SET departments = '{}'
-- WHERE departments IS NULL;

-- UPDATE users
-- SET manager_of_departments = '{}'
-- WHERE manager_of_departments IS NULL;

-- ============================================================================
-- STEP 7: If department column has value but departments array is empty, migrate
-- ============================================================================

-- PREVIEW: Users who need migration
SELECT
    id,
    email,
    department,
    departments,
    'Would set departments = ARRAY[department]' as proposed_fix
FROM users
WHERE department IS NOT NULL
  AND department != ''
  AND (departments IS NULL OR departments = '{}');

-- ACTUAL FIX (uncomment to run):
-- UPDATE users
-- SET departments = ARRAY[department]
-- WHERE department IS NOT NULL
--   AND department != ''
--   AND (departments IS NULL OR departments = '{}');
