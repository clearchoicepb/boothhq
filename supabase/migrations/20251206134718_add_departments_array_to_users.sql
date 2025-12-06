-- Migration: Add departments array column to users table
-- Date: 2025-12-06
-- Purpose: Support users belonging to multiple departments
--
-- Background:
-- The codebase expects a `departments TEXT[]` column for multi-department support,
-- but only `department TEXT` (singular) exists in the database.
-- This causes department data to save as NULL.
--
-- This migration:
-- 1. Adds the departments TEXT[] column
-- 2. Creates a GIN index for efficient array queries
-- 3. Migrates existing data from the legacy department column
-- 4. Keeps the legacy department column for backward compatibility

-- =============================================================================
-- ADD DEPARTMENTS ARRAY COLUMN
-- =============================================================================

-- Add departments array column (if not exists for idempotency)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT '{}';

-- =============================================================================
-- CREATE INDEX
-- =============================================================================

-- Create GIN index for efficient array containment queries
-- Example: SELECT * FROM users WHERE 'design' = ANY(departments);
CREATE INDEX IF NOT EXISTS idx_users_departments
ON users USING GIN (departments);

-- =============================================================================
-- MIGRATE EXISTING DATA
-- =============================================================================

-- Migrate existing data from legacy department column to new departments array
-- Only migrate if departments is empty/null and department has a value
UPDATE users
SET departments = ARRAY[department]
WHERE department IS NOT NULL
  AND department != ''
  AND (departments IS NULL OR departments = '{}');

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Add comment for documentation
COMMENT ON COLUMN users.departments IS 'Array of department IDs the user belongs to (e.g., ["sales", "design"]). Replaces legacy single department column.';

-- Update legacy column comment
COMMENT ON COLUMN users.department IS 'DEPRECATED: Legacy single department. Use departments[] array instead. Kept for backward compatibility.';

-- =============================================================================
-- VERIFICATION QUERY (run manually to verify migration)
-- =============================================================================

-- After running migration, verify with:
-- SELECT id, email, department, departments, manager_of_departments
-- FROM users
-- WHERE department IS NOT NULL OR departments != '{}';
