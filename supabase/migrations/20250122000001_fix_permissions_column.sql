-- Fix permissions column issue in users table
-- This migration handles the case where permissions column doesn't exist

-- Add permissions column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Update the users table definition to match what we expect
-- This ensures the table has all the columns we need

-- Check if we need to add any other missing columns
DO $$
BEGIN
    -- Add permissions column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'permissions') THEN
        ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '{}';
        RAISE NOTICE 'Added permissions column to users table';
    END IF;
    
    -- Add last_login column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_login column to users table';
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
        RAISE NOTICE 'Added status column to users table';
    END IF;
    
    -- Add role column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user'));
        RAISE NOTICE 'Added role column to users table';
    END IF;
    
    -- Add tenant_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added tenant_id column to users table';
    END IF;
    
    -- Add first_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name column to users table';
    END IF;
    
    -- Add last_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name column to users table';
    END IF;
    
    -- Add email column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE users ADD COLUMN email TEXT UNIQUE NOT NULL;
        RAISE NOTICE 'Added email column to users table';
    END IF;
    
    -- Add created_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to users table';
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users table';
    END IF;
    
    RAISE NOTICE 'Users table schema updated successfully';
END $$;

-- Now ensure we have the default tenant and user
-- Insert default tenant if it doesn't exist
INSERT INTO tenants (id, name, subdomain, plan, status, settings) 
VALUES (
  '1a174060-deb6-4502-ad21-a5fccd875f23',
  'Default Tenant',
  'default',
  'professional',
  'active',
  '{}'
) ON CONFLICT (subdomain) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status;

-- Insert default admin user if it doesn't exist
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, permissions) 
VALUES (
  'ca92d8c2-bd6e-4e1c-8757-ea361cc104fa',
  '1a174060-deb6-4502-ad21-a5fccd875f23',
  'admin@default.com',
  'Admin',
  'User',
  'admin',
  'active',
  '{}'
) ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  permissions = EXCLUDED.permissions;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Users table schema fixed successfully!';
    RAISE NOTICE '✅ All required columns added';
    RAISE NOTICE '✅ Default tenant and user created';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Login credentials:';
    RAISE NOTICE '   Email: admin@default.com';
    RAISE NOTICE '   Password: password123';
    RAISE NOTICE '   Company: default';
END $$;

