-- Update address fields to use separate columns instead of JSONB
-- This migration converts the existing JSONB address fields to separate columns

-- Add new address columns to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS billing_address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS billing_address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_state TEXT,
ADD COLUMN IF NOT EXISTS billing_zip_code TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_state TEXT,
ADD COLUMN IF NOT EXISTS shipping_zip_code TEXT;

-- Migrate existing data from JSONB to separate columns
UPDATE accounts 
SET 
  billing_address_line_1 = (billing_address->>'line1')::TEXT,
  billing_address_line_2 = (billing_address->>'line2')::TEXT,
  billing_city = (billing_address->>'city')::TEXT,
  billing_state = (billing_address->>'state')::TEXT,
  billing_zip_code = (billing_address->>'zip')::TEXT,
  shipping_address_line_1 = (shipping_address->>'line1')::TEXT,
  shipping_address_line_2 = (shipping_address->>'line2')::TEXT,
  shipping_city = (shipping_address->>'city')::TEXT,
  shipping_state = (shipping_address->>'state')::TEXT,
  shipping_zip_code = (shipping_address->>'zip')::TEXT
WHERE billing_address IS NOT NULL OR shipping_address IS NOT NULL;

-- Add new address columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Migrate existing contact address data (if any exists)
UPDATE contacts 
SET 
  address_line_1 = (address->>'line1')::TEXT,
  address_line_2 = (address->>'line2')::TEXT,
  city = (address->>'city')::TEXT,
  state = (address->>'state')::TEXT,
  zip_code = (address->>'zip')::TEXT
WHERE address IS NOT NULL;

-- Update users table to include new staffing fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'tenant_admin', 'manager', 'user', 'staff')),
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS employee_type TEXT CHECK (employee_type IN ('W2', '1099', 'International')),
ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payroll_info JSONB,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Create tenant_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, setting_key)
);

-- Drop the old JSONB address columns after migration (commented out for safety)
-- ALTER TABLE accounts DROP COLUMN IF EXISTS billing_address;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS shipping_address;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS address;















