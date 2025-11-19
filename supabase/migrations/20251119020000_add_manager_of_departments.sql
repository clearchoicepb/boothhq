-- Migration: Add manager_of_departments column to users table
-- Purpose: Allow users to be managers of specific departments while being members of multiple
-- Example: User can be in [design, operations, sales] but only be manager of [operations]

-- Add manager_of_departments column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS manager_of_departments TEXT[] DEFAULT '{}';

-- Add GIN index for efficient array containment queries
CREATE INDEX IF NOT EXISTS idx_users_manager_of_departments 
ON users USING GIN (manager_of_departments);

-- Add comment for documentation
COMMENT ON COLUMN users.manager_of_departments IS 'Array of department names where this user has manager-level access. Subset of departments array.';

-- Example query to check if user is a design manager:
-- SELECT * FROM users WHERE 'design' = ANY(manager_of_departments);

