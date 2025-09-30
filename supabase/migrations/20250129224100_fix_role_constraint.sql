-- Quick fix for role constraint
-- This migration fixes the role constraint to allow event_staff

-- Drop existing constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with all our roles
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'sales_rep', 'operations_manager', 'event_staff', 'user'));

-- Update any existing users with invalid roles
UPDATE users SET role = 'event_staff' WHERE role = 'staff';
UPDATE users SET role = 'admin' WHERE role IN ('super_admin', 'tenant_admin');
UPDATE users SET role = 'user' WHERE role NOT IN ('admin', 'manager', 'sales_rep', 'operations_manager', 'event_staff', 'user');
