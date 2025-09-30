-- Add password_hash column and create admin user
-- Generated on 2025-09-30T15:36:06.773Z

-- Step 1: Add password_hash column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 2: Create admin user
INSERT INTO users (
  id,
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
  gen_random_uuid(),
  '5f98f4c0-5254-4c61-8633-55ea049c7f18',
  'admin@clearchoicephotos.com',
  'Admin',
  'User',
  'admin',
  'active',
  '$2b$10$fZY.uO6FR27SRL7pbLFl8OdHVSF6Xko2oAWEUQFZEWEnxCxeZVntW',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Step 3: Verify the admin user was created
SELECT id, email, first_name, last_name, role, status, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password hash exists' ELSE 'No password hash' END as password_status
FROM users 
WHERE email = 'admin@clearchoicephotos.com';
