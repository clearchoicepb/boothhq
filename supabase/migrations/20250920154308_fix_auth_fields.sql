-- Fix auth fields to match authentication system expectations
-- Add missing fields to the users table

-- Add missing fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Insert a default tenant (force insert even if exists)
INSERT INTO tenants (id, name, subdomain, plan, status) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Default Company',
  'default',
  'professional',
  'active'
) ON CONFLICT (subdomain) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status;

-- Insert a default user for the tenant
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, is_active) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@default.com',
  'Admin',
  'User',
  'admin',
  'active',
  'password123', -- In production, this should be properly hashed
  true
) ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active;

-- Insert some default settings for the tenant
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'accounts.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'contacts.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'leads.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'events.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'invoices.view', '"table"')
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Auth fields added and default data created successfully!';
    RAISE NOTICE 'Login with: admin@default.com / password123 / default';
END $$;
