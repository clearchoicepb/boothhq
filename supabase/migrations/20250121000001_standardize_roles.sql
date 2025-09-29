-- Standardize role system across the application
-- This migration adds constraints and migrates existing data

-- First, drop any existing role constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Then add the new constraint to ensure only valid roles are allowed
ALTER TABLE users 
ADD CONSTRAINT role_check 
CHECK (role IN ('admin', 'manager', 'sales_rep', 'operations_manager', 'event_staff', 'user'));

-- Migrate any existing non-standard roles to our new system
-- Map old roles to new roles
UPDATE users SET role = 'admin' WHERE role IN ('super_admin', 'tenant_admin');
UPDATE users SET role = 'manager' WHERE role = 'manager';
UPDATE users SET role = 'event_staff' WHERE role = 'staff';
UPDATE users SET role = 'user' WHERE role = 'user';

-- If there are any other roles that don't match, default them to 'user'
UPDATE users SET role = 'user' 
WHERE role NOT IN ('admin', 'manager', 'sales_rep', 'operations_manager', 'event_staff', 'user');

-- Add an index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

-- Add a comment to document the role system
COMMENT ON COLUMN users.role IS 'User role: admin, manager, sales_rep, operations_manager, event_staff, user';
