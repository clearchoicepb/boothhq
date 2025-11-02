-- Fix User Dashboard Access
-- Run this script to allow your admin user to access all department dashboards
-- UPDATED: Now uses system role (role column) instead of department_role

-- STEP 1: Check current user settings
SELECT
  id,
  email,
  first_name,
  last_name,
  role as system_role,
  department,
  department_role,
  'Current Settings' as status
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- STEP 2: Set your admin user's system role to 'admin' or 'tenant_admin'
-- This gives full access to ALL departments
-- Replace 'your-email@example.com' with your actual email

UPDATE users
SET role = 'admin'  -- or 'tenant_admin' for tenant-level admin
WHERE email = 'your-email@example.com'; -- CHANGE THIS TO YOUR EMAIL

-- STEP 3: Verify the changes
SELECT
  id,
  email,
  first_name,
  last_name,
  role as system_role,
  department,
  department_role,
  'After Update' as status
FROM users
WHERE email = 'your-email@example.com'; -- CHANGE THIS TO YOUR EMAIL

-- EXPLANATION:
-- Authorization hierarchy for department dashboards:
--
-- 1. SYSTEM ROLES (highest priority - full access to everything):
--    - 'admin'        = System administrator (full access)
--    - 'tenant_admin' = Tenant administrator (full access within tenant)
--
-- 2. DEPARTMENT ROLES (department-level access):
--    - 'manager'      = Can access ALL departments
--    - 'supervisor'   = Can access only their own department
--    - 'member'       = Can access only their own department
--
-- If you have role='admin' or role='tenant_admin', you can access ALL department dashboards
-- regardless of your department or department_role settings.
--
-- Other system roles: 'sales_rep', 'operations_manager', 'user', 'staff' - need appropriate
-- department/department_role to access specific dashboards.
