-- Fix User Dashboard Access
-- Run this script to allow your admin user to access all department dashboards

-- STEP 1: Check current user settings
SELECT
  id,
  email,
  first_name,
  last_name,
  department,
  department_role,
  'Current Settings' as status
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- STEP 2: Set your admin user as a MANAGER (can access ALL departments)
-- Replace 'your-email@example.com' with your actual email

UPDATE users
SET department_role = 'manager'
WHERE email = 'your-email@example.com'; -- CHANGE THIS TO YOUR EMAIL

-- STEP 3: Optionally set a department (managers don't need one, but it's good for organization)
-- Uncomment and modify if desired:
-- UPDATE users
-- SET department = 'admin'
-- WHERE email = 'your-email@example.com';

-- STEP 4: Verify the changes
SELECT
  id,
  email,
  first_name,
  last_name,
  department,
  department_role,
  'After Update' as status
FROM users
WHERE email = 'your-email@example.com'; -- CHANGE THIS TO YOUR EMAIL

-- EXPLANATION:
-- department_role options:
--   - 'manager'    = Can access ALL departments (use this for admins)
--   - 'supervisor' = Can access only their own department
--   - 'member'     = Can access only their own department
--
-- department options:
--   - 'sales', 'design', 'operations', 'customer_success', 'accounting', 'admin'
--   - Managers can leave this NULL or set to 'admin'
