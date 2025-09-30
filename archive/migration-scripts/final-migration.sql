
-- Add password_hash column and create admin user
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

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
  '$2b$10$BTJUINvnHw.YqFGX9L1LleX3Qxgg..kAmVopqraLRgl/I8d.eAouS',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  status = 'active',
  updated_at = NOW()
RETURNING id, email, first_name, last_name, role;
