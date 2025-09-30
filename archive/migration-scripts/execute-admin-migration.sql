-- Add password_hash column and create admin user
-- Execute this in Supabase SQL Editor

BEGIN;

-- Step 1: Add password_hash column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 2: Insert admin user
INSERT INTO users (
  tenant_id,
  email,
  first_name,
  last_name,
  role,
  status,
  password_hash,
  created_at,
  updated_at
) VALUES (
  '5f98f4c0-5254-4c61-8633-55ea049c7f18',
  'admin@clearchoicephotos.com',
  'Admin',
  'User',
  'admin',
  'active',
  '$2b$10$Z5xsNVArTQcBdZhWXa3aaOPkdLs7jHxdvBHQkLQp86I1KwKNywPty',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  status = 'active',
  updated_at = NOW();

COMMIT;
