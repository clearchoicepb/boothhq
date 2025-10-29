-- ============================================================================
-- MIGRATE USERS TABLE FROM APP DB TO TENANT DB
-- ============================================================================
-- Run this SQL in your TENANT DB SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE USERS TABLE IN TENANT DB
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Login tracking
  last_login TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Profile information
  password_hash TEXT,
  phone TEXT,
  avatar_url TEXT,
  permissions JSONB DEFAULT '{}',
  
  -- Address information
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Employee information
  job_title TEXT,
  department TEXT,
  employee_type TEXT,
  pay_rate DECIMAL(10,2),
  payroll_info JSONB,
  hire_date DATE,
  termination_date DATE,
  
  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================================
-- STEP 2: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT ALL ON users TO postgres;

-- ============================================================================
-- STEP 3: INSERT USER DATA (8 users)
-- ============================================================================

INSERT INTO users (
  id, tenant_id, email, first_name, last_name, role, status, last_login, created_at, updated_at, password_hash, phone, avatar_url, permissions, address_line_1, address_line_2, city, state, zip_code, job_title, department, employee_type, pay_rate, payroll_info, hire_date, termination_date, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, last_login_at, is_active
) VALUES
  ('253cf343-10c5-4d98-a17c-e79275387bec', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'admin@default.com', 'Admin', 'User', 'admin', 'active', '2025-10-03T13:46:49.64+00:00', '2025-09-29T21:38:57.834091+00:00', '2025-10-07T21:24:31.848249+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('9f5084eb-3ffb-43c5-9802-63c50b129aa5', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'dhobrath81@gmail.com', 'David', 'Hobrath', 'admin', 'inactive', '2025-10-07T22:38:43.082+00:00', '2025-09-29T23:03:20.619242+00:00', '2025-10-07T23:04:25.526626+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('fcb7ec1f-7599-4ec2-893a-bef11b30a32e', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'admin@clearchoicephotos.com', 'Admin', 'User', 'admin', 'active', '2025-10-29T00:50:45.479+00:00', '2025-09-30T16:22:42.282823+00:00', '2025-10-29T00:50:45.532885+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('6e852798-3781-4ea2-a3e6-5f059c131974', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'operations@clearchoicephotos.com', 'Operations', 'Team', 'operations_manager', 'inactive', NULL, '2025-09-30T17:11:08.846593+00:00', '2025-10-07T23:04:25.526626+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('0f64238b-5c85-4000-b4e1-680e5786ee15', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'amanda@clearchoicephotos.com', 'Amanda', 'Smith', 'admin', 'active', NULL, '2025-10-06T21:33:50.223854+00:00', '2025-10-07T03:11:48.648032+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, 'Operations Manager', 'Operations', 'W2', 25, NULL, '2023-01-01', NULL, NULL, NULL, NULL, NULL, true),
  ('7303eb89-1e58-487c-bb51-a8ef2c7afa44', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'bryan@clearchoicephotos.com', 'Bryan', 'Santos', 'admin', 'active', '2025-10-27T12:14:57.313+00:00', '2025-10-07T10:14:29.210477+00:00', '2025-10-27T12:14:57.355544+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, 'Sales and Operations Specialist', 'Sales and Operations', 'International', NULL, NULL, '2025-09-22', NULL, NULL, NULL, NULL, NULL, true),
  ('b1a3a7d0-4a1e-42d1-85e3-31b9e65df12a', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'paul@clearchoicephotos.com', 'Paul', 'Amper', 'admin', 'active', '2025-10-28T19:15:16.098+00:00', '2025-10-07T17:33:19.881074+00:00', '2025-10-28T19:15:16.144018+00:00', NULL, NULL, NULL, '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, 'Sales and Operations Assistant', 'Operations', 'International', NULL, NULL, '2025-09-22', NULL, NULL, NULL, NULL, NULL, true),
  ('e96536dd-2fcf-4edd-846c-c7bc3456f1d1', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Raphael@clearchoicephotos.com', 'Raphael', 'Lumibao', 'admin', 'active', '2025-10-22T14:19:19.072+00:00', '2025-10-22T13:56:58.967162+00:00', '2025-10-22T14:19:19.125408+00:00', NULL, '4405223302', NULL, '{}'::jsonb, '29299 Clemens Rd', 'Suite 1E', 'Westlake', 'Ohio', '44145', 'Sr Graphic Designer', 'Creative Team', 'International', 7.53, NULL, '2025-02-14', NULL, NULL, NULL, NULL, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 4: UPDATE FOREIGN KEY REFERENCES
-- ============================================================================

-- Update any tables that reference users to point to tenant DB users table
-- Most references should already work since we're using the same UUIDs

-- For event_design_items
ALTER TABLE event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_assigned_designer_id_fkey;

ALTER TABLE event_design_items
  ADD CONSTRAINT event_design_items_assigned_designer_id_fkey
  FOREIGN KEY (assigned_designer_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- For any other tables with user references, add similar constraints

-- ============================================================================
-- STEP 5: RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Check user count
SELECT COUNT(*) as user_count FROM users;

-- Check users by role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

-- Verify tenant_id
SELECT DISTINCT tenant_id FROM users;

-- Test a join with design items
SELECT 
  d.id,
  d.item_name,
  u.first_name || ' ' || u.last_name as designer_name
FROM event_design_items d
LEFT JOIN users u ON d.assigned_designer_id = u.id
LIMIT 5;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If verification queries pass, users table is now in Tenant DB
-- Next: Update application code to use Tenant DB for users
-- ============================================================================

