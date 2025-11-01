-- ============================================================================
-- Fix User Department Values
-- Updates users to use valid department enum values
-- ============================================================================

-- ============================================================================
-- STEP 1: See current invalid values
-- ============================================================================

SELECT
    id,
    first_name,
    last_name,
    email,
    department,
    department_role,
    CASE
        WHEN department = 'Creative Team' THEN 'design'
        WHEN department = 'Sales and Operations' THEN 'sales'
        WHEN department IN ('sales', 'design', 'operations', 'customer_success', 'accounting', 'admin') THEN department
        ELSE 'UNKNOWN - NEEDS MANUAL FIX'
    END as suggested_department
FROM users
WHERE department IS NOT NULL
ORDER BY department;

-- ============================================================================
-- STEP 2: Map incorrect values to correct enum values
-- ============================================================================

/*
Current wrong values and their correct mappings:
- 'Creative Team' → 'design'
- 'Sales and Operations' → 'sales' (or maybe split into two users?)
- 'Operations' → 'operations' (already correct!)
*/

-- ============================================================================
-- STEP 3: Update users with incorrect department values
-- ============================================================================

-- Update Creative Team → design
UPDATE users
SET department = 'design'
WHERE department = 'Creative Team';

-- Update Sales and Operations → sales
-- NOTE: If this user does BOTH sales and operations, they should pick one
-- or you might need to create a second user account
UPDATE users
SET department = 'sales'
WHERE department = 'Sales and Operations';

-- ============================================================================
-- STEP 4: Verify the fix
-- ============================================================================

-- Check all users now have valid department values
SELECT
    department,
    department_role,
    COUNT(*) as user_count,
    CASE
        WHEN department IN ('sales', 'design', 'operations', 'customer_success', 'accounting', 'admin')
        THEN '✅ Valid'
        WHEN department IS NULL
        THEN '⚠️  Not assigned'
        ELSE '❌ Invalid'
    END as validation_status
FROM users
GROUP BY department, department_role
ORDER BY department;

-- ============================================================================
-- STEP 5: Set default department_role for users missing it
-- ============================================================================

-- Set department_role to 'member' if NULL
UPDATE users
SET department_role = 'member'
WHERE department IS NOT NULL
AND department_role IS NULL;

-- ============================================================================
-- EXPECTED RESULT AFTER RUNNING THIS:
-- ============================================================================

/*
All users should have:
- department IN ('sales', 'design', 'operations', 'customer_success', 'accounting', 'admin', NULL)
- department_role IN ('member', 'supervisor', 'manager')

Example valid result:
{
  "department": "design",
  "department_role": "member",
  "user_count": 1,
  "validation_status": "✅ Valid"
},
{
  "department": "operations",
  "department_role": "member",
  "user_count": 2,
  "validation_status": "✅ Valid"
},
{
  "department": "sales",
  "department_role": "member",
  "user_count": 1,
  "validation_status": "✅ Valid"
}
*/

-- ============================================================================
-- NOTES:
-- ============================================================================

/*
1. Run STEP 1 first to see what needs to be fixed
2. Review suggested mappings
3. If you disagree with any mapping, update the UPDATE statements in STEP 3
4. Run STEP 3 to apply the fixes
5. Run STEP 4 to verify all departments are now valid
6. Run STEP 5 to ensure all users have a department_role

This must be run on BOTH databases:
- Application Database (where users authenticate)
- Tenant Database (for business operations)
*/
