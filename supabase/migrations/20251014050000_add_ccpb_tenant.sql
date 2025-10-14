-- Create Clear Choice Photo Booth tenant and admin user
-- Migration: Add CCPB tenant for david@clearchoicephotos.com

-- Generate a new tenant ID for Clear Choice Photo Booth
DO $$
DECLARE
  v_tenant_id UUID := '2e5a9f3d-8b7c-4a1e-9d2f-6c8e5b4a3d1f';
BEGIN
  -- Insert Clear Choice Photo Booth tenant
  INSERT INTO tenants (id, name, subdomain, plan, status, settings)
  VALUES (
    v_tenant_id,
    'Clear Choice Photo Booth',
    'ccpb',
    'enterprise',
    'active',
    '{
      "company_name": "Clear Choice Photo Booth",
      "industry": "events",
      "timezone": "America/New_York"
    }'::jsonb
  )
  ON CONFLICT (subdomain) DO UPDATE SET
    name = EXCLUDED.name,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    settings = EXCLUDED.settings;

  -- Create admin user for David Hobrath
  -- Note: The email must already exist in Supabase Auth (auth.users table)
  INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status)
  VALUES (
    gen_random_uuid(),
    v_tenant_id,
    'david@clearchoicephotos.com',
    'David',
    'Hobrath',
    'admin',
    'active'
  )
  ON CONFLICT (tenant_id, email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  RAISE NOTICE '✓ Clear Choice Photo Booth tenant created/updated successfully';
  RAISE NOTICE '✓ Tenant ID: %', v_tenant_id;
  RAISE NOTICE '✓ Admin user created for david@clearchoicephotos.com';
  RAISE NOTICE '→ You can now log in at: http://localhost:3000/ccpb/';
END $$;
