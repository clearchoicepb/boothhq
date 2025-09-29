-- =====================================================
-- SIMPLE AUTHENTICATION FIX
-- =====================================================
-- Run this in Supabase SQL Editor to fix login issues

-- Create demo tenant
INSERT INTO tenants (id, name, subdomain, plan, status) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Default Company',
  'default',
  'professional',
  'active'
) ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status;

-- Create demo user with proper password hash
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, is_active) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@default.com',
  'Admin',
  'User',
  'admin',
  'active',
  '$2b$12$c5DtYC/rF9RYJ/hh6mRAIe6FnRtmA37Lvy/xrUbuBV/bmtahFFgTm',
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

-- Add basic settings
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'accounts.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'contacts.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'events.view', '"table"'),
  ('550e8400-e29b-41d4-a716-446655440000', 'opportunities.view', '"table"')
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Verify setup
SELECT 'Demo tenant and user created successfully!' as result;
