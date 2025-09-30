-- Add password_hash column to users table
-- This migration adds proper password storage support

-- Add password_hash column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for user authentication';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added password_hash column to users table';
END $$;
