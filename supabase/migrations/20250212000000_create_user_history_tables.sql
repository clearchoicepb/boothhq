-- First, add staffing fields to users table if they don't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS address_line_1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employee_type VARCHAR(20) CHECK (employee_type IN ('W2', '1099', 'International')),
  ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS payroll_info JSONB,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS termination_date DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create user_pay_rate_history table to track pay rate changes over time
CREATE TABLE IF NOT EXISTS user_pay_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Pay rate information
  pay_rate DECIMAL(10, 2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE, -- NULL means current rate
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Ensure no overlapping date ranges for the same user
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > effective_date)
);

-- Create user_role_history table to track system role changes over time
CREATE TABLE IF NOT EXISTS user_role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role information
  role VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE, -- NULL means current role
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Ensure no overlapping date ranges for the same user
  CONSTRAINT valid_role_date_range CHECK (end_date IS NULL OR end_date > effective_date)
);

-- Create indexes for performance
CREATE INDEX idx_pay_rate_history_tenant_id ON user_pay_rate_history(tenant_id);
CREATE INDEX idx_pay_rate_history_user_id ON user_pay_rate_history(user_id);
CREATE INDEX idx_pay_rate_history_effective_date ON user_pay_rate_history(effective_date DESC);

CREATE INDEX idx_role_history_tenant_id ON user_role_history(tenant_id);
CREATE INDEX idx_role_history_user_id ON user_role_history(user_id);
CREATE INDEX idx_role_history_effective_date ON user_role_history(effective_date DESC);

-- Disable RLS (we're using NextAuth, not Supabase Auth)
ALTER TABLE user_pay_rate_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_history DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE user_pay_rate_history IS 'Historical tracking of user pay rate changes';
COMMENT ON TABLE user_role_history IS 'Historical tracking of user system role changes';

-- Migrate existing user data to history tables
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Migrate existing pay rates
  FOR user_record IN SELECT id, tenant_id, pay_rate, hire_date FROM users WHERE pay_rate IS NOT NULL LOOP
    INSERT INTO user_pay_rate_history (tenant_id, user_id, pay_rate, effective_date)
    VALUES (
      user_record.tenant_id,
      user_record.id,
      user_record.pay_rate,
      COALESCE(user_record.hire_date, CURRENT_DATE)
    );
  END LOOP;

  -- Migrate existing roles
  FOR user_record IN SELECT id, tenant_id, role, hire_date FROM users LOOP
    INSERT INTO user_role_history (tenant_id, user_id, role, effective_date)
    VALUES (
      user_record.tenant_id,
      user_record.id,
      user_record.role,
      COALESCE(user_record.hire_date, CURRENT_DATE)
    );
  END LOOP;

  RAISE NOTICE 'User history tables created and populated successfully!';
END $$;
