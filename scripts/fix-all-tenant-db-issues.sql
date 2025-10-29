-- ============================================================================
-- FIX ALL TENANT DB ISSUES AFTER USERS MIGRATION
-- ============================================================================
-- Run this SQL in your TENANT DB SQL Editor
-- ============================================================================
-- This script:
-- 1. Adds foreign keys that reference users table
-- 2. Creates staff_roles table with default roles
-- 3. Creates event_staff_assignments table
-- 4. Creates payment_status_options table with default statuses
-- ============================================================================

-- ============================================================================
-- PART 1: ADD FOREIGN KEYS FOR USERS (ONLY FOR COLUMNS THAT EXIST!)
-- ============================================================================
-- Verified columns:
-- ✅ events: event_planner_id
-- ✅ attachments: uploaded_by
-- ✅ accounts: assigned_to
-- ✅ tasks: assigned_to, created_by
-- ✅ notes: created_by
-- ✅ communications: created_by
-- ============================================================================

-- Events (event_planner_id only - no created_by column)
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_event_planner_id_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_event_planner_id_fkey
  FOREIGN KEY (event_planner_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Attachments (uploaded_by)
ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_uploaded_by_fkey
  FOREIGN KEY (uploaded_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Accounts (assigned_to only - no created_by column)
ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_assigned_to_fkey;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Tasks (assigned_to, created_by)
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Notes (created_by)
ALTER TABLE notes
  DROP CONSTRAINT IF EXISTS notes_created_by_fkey;

ALTER TABLE notes
  ADD CONSTRAINT notes_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Communications (created_by)
ALTER TABLE communications
  DROP CONSTRAINT IF EXISTS communications_created_by_fkey;

ALTER TABLE communications
  ADD CONSTRAINT communications_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- PART 2: CREATE STAFF_ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('operations', 'event_staff')),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_tenant_active ON staff_roles(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_roles_type ON staff_roles(type);

-- Grant permissions
GRANT ALL ON staff_roles TO authenticated;
GRANT ALL ON staff_roles TO service_role;
GRANT ALL ON staff_roles TO postgres;

-- Insert default staff roles for the tenant (using your tenant_id)
INSERT INTO staff_roles (tenant_id, name, type, is_active, is_default, sort_order)
VALUES
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Graphic Designer', 'operations', TRUE, TRUE, 0),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Event Manager', 'operations', TRUE, TRUE, 1),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Technician', 'event_staff', TRUE, TRUE, 0),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Event Host', 'event_staff', TRUE, TRUE, 1),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Brand Ambassador', 'event_staff', TRUE, TRUE, 2)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- PART 3: CREATE EVENT_STAFF_ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Relations
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_date_id UUID, -- NULL means assigned to overall event
  staff_role_id UUID, -- References staff_roles
  
  -- Assignment details
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE(tenant_id, event_id, user_id, event_date_id)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_tenant_id ON event_staff_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user_id ON event_staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_date_id ON event_staff_assignments(event_date_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_created_at ON event_staff_assignments(created_at DESC);

-- Grant permissions
GRANT ALL ON event_staff_assignments TO authenticated;
GRANT ALL ON event_staff_assignments TO service_role;
GRANT ALL ON event_staff_assignments TO postgres;

-- Add foreign keys
ALTER TABLE event_staff_assignments
  DROP CONSTRAINT IF EXISTS event_staff_assignments_event_id_fkey;

ALTER TABLE event_staff_assignments
  ADD CONSTRAINT event_staff_assignments_event_id_fkey
  FOREIGN KEY (event_id)
  REFERENCES events(id)
  ON DELETE CASCADE;

ALTER TABLE event_staff_assignments
  DROP CONSTRAINT IF EXISTS event_staff_assignments_user_id_fkey;

ALTER TABLE event_staff_assignments
  ADD CONSTRAINT event_staff_assignments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE event_staff_assignments
  DROP CONSTRAINT IF EXISTS event_staff_assignments_event_date_id_fkey;

ALTER TABLE event_staff_assignments
  ADD CONSTRAINT event_staff_assignments_event_date_id_fkey
  FOREIGN KEY (event_date_id)
  REFERENCES event_dates(id)
  ON DELETE CASCADE;

ALTER TABLE event_staff_assignments
  DROP CONSTRAINT IF EXISTS event_staff_assignments_staff_role_id_fkey;

ALTER TABLE event_staff_assignments
  ADD CONSTRAINT event_staff_assignments_staff_role_id_fkey
  FOREIGN KEY (staff_role_id)
  REFERENCES staff_roles(id)
  ON DELETE SET NULL;

-- ============================================================================
-- PART 4: CREATE PAYMENT_STATUS_OPTIONS TABLE
-- ============================================================================

-- Add payment_status column to events if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_status VARCHAR(100);

-- Create payment_status_options table
CREATE TABLE IF NOT EXISTS payment_status_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Status details
  status_name VARCHAR(100) NOT NULL,
  status_color VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(tenant_id, status_name)
);

CREATE INDEX IF NOT EXISTS idx_payment_status_options_tenant_id ON payment_status_options(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_options_display_order ON payment_status_options(display_order);

-- Grant permissions
GRANT ALL ON payment_status_options TO authenticated;
GRANT ALL ON payment_status_options TO service_role;
GRANT ALL ON payment_status_options TO postgres;

-- Insert default payment status options
INSERT INTO payment_status_options (tenant_id, status_name, status_color, display_order, is_active)
VALUES
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Not Paid', 'gray', 1, TRUE),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Deposit Paid', 'yellow', 2, TRUE),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Past Due', 'red', 3, TRUE),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Paid in Full', 'green', 4, TRUE)
ON CONFLICT (tenant_id, status_name) DO NOTHING;

-- ============================================================================
-- PART 5: RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- PART 6: VERIFICATION
-- ============================================================================

-- Check foreign keys to users table
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE confrelid = 'users'::regclass
AND contype = 'f'
ORDER BY table_name, column_name;

-- Expected results:
-- accounts_assigned_to_fkey | accounts | assigned_to | users
-- attachments_uploaded_by_fkey | attachments | uploaded_by | users  
-- communications_created_by_fkey | communications | created_by | users
-- event_staff_assignments_user_id_fkey | event_staff_assignments | user_id | users
-- events_event_planner_id_fkey | events | event_planner_id | users
-- notes_created_by_fkey | notes | created_by | users
-- tasks_assigned_to_fkey | tasks | assigned_to | users
-- tasks_created_by_fkey | tasks | created_by | users

-- Check new tables
SELECT 'staff_roles' as table_name, COUNT(*) as count FROM staff_roles
UNION ALL
SELECT 'event_staff_assignments', COUNT(*) FROM event_staff_assignments
UNION ALL
SELECT 'payment_status_options', COUNT(*) FROM payment_status_options;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- All issues should now be fixed:
-- ✅ Event planner field will show (FK added: events.event_planner_id → users)
-- ✅ Attachment uploader name will show (FK added: attachments.uploaded_by → users)
-- ✅ Staff assignments feature fully set up (staff_roles + event_staff_assignments)
-- ✅ Payment status options available (payment_status_options table)
-- ✅ User assignment fields working (accounts, tasks, notes, communications)
-- ============================================================================
-- Total Foreign Keys Added: 8 (only for columns that actually exist)
-- Tables Created: 3 (staff_roles, event_staff_assignments, payment_status_options)
-- Default Data Rows: 9 (5 staff roles + 4 payment statuses)
-- ============================================================================

