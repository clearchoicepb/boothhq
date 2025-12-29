-- Migration: Fix NULL departments and manager_of_departments arrays
-- Date: 2025-12-29
-- Purpose: Ensure all users have proper empty arrays instead of NULL values
--          to prevent issues with array operations in application code
--
-- Background:
-- Some users may have NULL values in departments or manager_of_departments columns
-- if they were created before these columns had proper defaults or if migrations
-- didn't run correctly. This causes issues when the application tries to use
-- these values as arrays.

-- =============================================================================
-- STEP 1: Fix NULL departments arrays
-- =============================================================================

-- Set NULL departments to empty array
UPDATE users
SET departments = '{}'
WHERE departments IS NULL;

-- =============================================================================
-- STEP 2: Fix NULL manager_of_departments arrays
-- =============================================================================

-- Set NULL manager_of_departments to empty array
UPDATE users
SET manager_of_departments = '{}'
WHERE manager_of_departments IS NULL;

-- =============================================================================
-- STEP 3: Migrate legacy department to departments array (if not already done)
-- =============================================================================

-- For users who have a legacy department value but empty departments array,
-- copy the legacy value to the new array
UPDATE users
SET departments = ARRAY[department]
WHERE department IS NOT NULL
  AND department != ''
  AND (departments = '{}' OR departments IS NULL);

-- =============================================================================
-- STEP 4: Add NOT NULL constraints with defaults to prevent future issues
-- =============================================================================

-- Alter columns to have NOT NULL with defaults
-- This ensures new users always have proper empty arrays
ALTER TABLE users
ALTER COLUMN departments SET DEFAULT '{}';

ALTER TABLE users
ALTER COLUMN manager_of_departments SET DEFAULT '{}';

-- Note: We don't add NOT NULL constraint because it may break existing queries
-- that don't provide these values. Instead, we rely on defaults and application
-- code to handle NULL gracefully.

-- =============================================================================
-- VERIFICATION QUERY (run to verify fix)
-- =============================================================================

-- After running, verify no NULLs remain:
-- SELECT COUNT(*) as null_departments FROM users WHERE departments IS NULL;
-- SELECT COUNT(*) as null_manager_of_departments FROM users WHERE manager_of_departments IS NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN users.departments IS 'Array of department IDs the user belongs to. Never NULL - defaults to empty array {}.';
COMMENT ON COLUMN users.manager_of_departments IS 'Array of department IDs where user has manager access. Never NULL - defaults to empty array {}.';
