-- Add archived_at column to users table for soft delete functionality
-- When NULL = active user, when populated = archived user

-- Add the archived_at column
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create an index on archived_at for efficient filtering of archived/active users
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at) WHERE archived_at IS NULL;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN users.archived_at IS 'Timestamp when user was archived (soft deleted). NULL means user is active.';
