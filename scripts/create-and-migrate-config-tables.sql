-- ============================================================================
-- CREATE AND MIGRATE CONFIGURATION TABLES TO TENANT DB
-- ============================================================================
-- Run this COMPLETE SQL in your TENANT DB SQL Editor
-- This creates the tables and inserts the data in one go
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE MISSING TABLES
-- ============================================================================

-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Category details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),

  -- Configuration
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  UNIQUE(tenant_id, slug),
  UNIQUE(tenant_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_event_categories_tenant_id ON event_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_slug ON event_categories(slug);

-- Create event_types table
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_category_id UUID NOT NULL,

  -- Type details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,

  -- Configuration
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  UNIQUE(tenant_id, event_category_id, slug),
  UNIQUE(tenant_id, event_category_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_event_types_tenant_id ON event_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_types_category_id ON event_types(event_category_id);

-- Create design_statuses table  
CREATE TABLE IF NOT EXISTS design_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT 'gray',

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_design_status_per_tenant UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_design_statuses_tenant ON design_statuses(tenant_id);

-- Create core_task_templates table
CREATE TABLE IF NOT EXISTS core_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  task_name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_core_task_templates_tenant_id ON core_task_templates(tenant_id);

-- ============================================================================
-- STEP 2: GRANT PERMISSIONS (before inserting data)
-- ============================================================================

GRANT ALL ON event_categories TO authenticated;
GRANT ALL ON event_categories TO service_role;
GRANT ALL ON event_categories TO postgres;

GRANT ALL ON event_types TO authenticated;
GRANT ALL ON event_types TO service_role;
GRANT ALL ON event_types TO postgres;

GRANT ALL ON design_statuses TO authenticated;
GRANT ALL ON design_statuses TO service_role;
GRANT ALL ON design_statuses TO postgres;

GRANT ALL ON core_task_templates TO authenticated;
GRANT ALL ON core_task_templates TO service_role;
GRANT ALL ON core_task_templates TO postgres;

-- ============================================================================
-- STEP 3: INSERT DATA (before adding foreign keys!)
-- ============================================================================

-- Migrate event_categories (3 records)
INSERT INTO event_categories (id, tenant_id, name, slug, description, color, icon, is_active, is_system_default, display_order, created_at, updated_at, created_by)
VALUES
  ('a464df00-c1ba-4c9f-81f4-ae919bc2b92c', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Test Category', 'test-category', 'This is a test', '#ff0000', 'calendar', true, false, 3, '2025-10-13T13:15:58.376686+00:00', '2025-10-13T13:15:58.376686+00:00', 'fcb7ec1f-7599-4ec2-893a-bef11b30a32e'),
  ('8ad43f96-136b-433e-b2d7-f7bb24d6aeca', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Social Event', 'social-event', 'Entertainment-focused events like weddings, parties, and celebrations', '#EC4899', 'users', true, true, 1, '2025-10-13T12:11:43.235374+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('ab2d0e19-501e-40f6-97d1-0d833b433a9d', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Corporate Event', 'corporate-event', 'Business events including marketing activations, conferences, and corporate functions', '#3B82F6', 'building', true, true, 2, '2025-10-13T12:11:43.316738+00:00', '2025-10-13T20:51:18.52427+00:00', NULL)
ON CONFLICT (id) DO NOTHING;

-- Migrate event_types (16 records)
INSERT INTO event_types (id, tenant_id, event_category_id, name, slug, description, is_active, is_system_default, display_order, created_at, updated_at, created_by)
VALUES
  ('c5940e41-3878-4ea3-8885-b8605dd56fd8', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Wedding', 'wedding', NULL, true, true, 1, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('f4e390df-3fc1-47e4-81bd-8c40a4da64e2', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Birthday Party', 'birthday-party', NULL, true, true, 2, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('c36e0674-da3d-4123-be87-20022aae6b96', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Sweet 16', 'sweet-16', NULL, true, true, 3, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('27adcd94-e383-4b3d-9d9e-b843d6fb21f9', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Bar/Bat Mitzvah', 'bar-bat-mitzvah', NULL, true, true, 4, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('452013d1-e586-4c8d-9310-9673d13ca4a1', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Quinceañera', 'quinceanera', NULL, true, true, 5, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('22898345-8d46-402a-8250-0ad168efc482', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Holiday Party', 'holiday-party', NULL, true, true, 6, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('96d96990-a81c-49ac-b172-4eeac6bae819', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'ab2d0e19-501e-40f6-97d1-0d833b433a9d', 'Marketing Activation', 'marketing-activation', NULL, true, true, 1, '2025-10-13T12:11:43.437409+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('d56941c0-c0f8-4559-ac56-19bed7cda781', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'ab2d0e19-501e-40f6-97d1-0d833b433a9d', 'Convention', 'convention', NULL, true, true, 2, '2025-10-13T12:11:43.437409+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('99ee061a-41f8-4270-b9ef-5347bc6b7e21', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'ab2d0e19-501e-40f6-97d1-0d833b433a9d', 'Conference', 'conference', NULL, true, true, 3, '2025-10-13T12:11:43.437409+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('3979baac-293f-44b6-9aa2-ce1679cdfc76', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'ab2d0e19-501e-40f6-97d1-0d833b433a9d', 'Internal Corporate Event', 'internal-corporate-event', NULL, true, true, 4, '2025-10-13T12:11:43.437409+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('047c731c-c798-4c95-a6cf-ceb34a3d6985', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'ab2d0e19-501e-40f6-97d1-0d833b433a9d', 'Misc Corporate Event', 'misc-corporate-event', NULL, true, true, 5, '2025-10-13T12:11:43.437409+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('46f284b3-8560-47e8-b7ef-0561c0abad35', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'a464df00-c1ba-4c9f-81f4-ae919bc2b92c', 'Test Category - Event Type', 'test-category-event-type', 'Testing this out', true, false, 1, '2025-10-13T13:17:02.534367+00:00', '2025-10-13T13:17:02.534367+00:00', 'fcb7ec1f-7599-4ec2-893a-bef11b30a32e'),
  ('fd5e191f-f7ba-4d86-818d-ca045d3db73a', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Graduation Party', 'graduation-party', NULL, true, true, 7, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('07fa8c98-9842-43d7-9b58-84310bc3a3ae', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'School Dance', 'school-dance', NULL, true, true, 8, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('295741c0-f273-4fec-926b-251f1812ba23', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Misc School Event', 'misc-school-event', NULL, true, true, 9, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL),
  ('354fe4ce-65e8-4839-9904-27c288f9b790', '5f98f4c0-5254-4c61-8633-55ea049c7f18', '8ad43f96-136b-433e-b2d7-f7bb24d6aeca', 'Misc Social Event', 'misc-social-event', NULL, true, true, 10, '2025-10-13T12:11:43.377078+00:00', '2025-10-13T20:51:18.52427+00:00', NULL)
ON CONFLICT (id) DO NOTHING;

-- Migrate design_statuses (7 records)
INSERT INTO design_statuses (id, tenant_id, name, slug, color, is_active, is_default, display_order, created_at, updated_at, is_completed)
VALUES
  ('f7c90321-6208-40ef-87fd-965e5923cb32', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Pending Design Form', 'pending_design_form', 'gray', true, true, 1, '2025-10-14T00:52:39.674627+00:00', '2025-10-14T00:52:39.674627+00:00', false),
  ('91efe23f-eaa5-4794-92ec-9b3d3d28de3f', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Design Form Received', 'design_form_received', 'blue', true, true, 2, '2025-10-14T00:52:39.674627+00:00', '2025-10-14T00:52:39.674627+00:00', false),
  ('8ca5d791-59f9-4b46-8c43-f4fbbcf3e4b1', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Initial Design in Progress', 'initial_design_in_progress', 'yellow', true, true, 3, '2025-10-14T00:52:39.674627+00:00', '2025-10-14T00:52:39.674627+00:00', false),
  ('56217a1e-ef46-4ec2-8f9a-752934d476b2', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Pending Client Approval', 'pending_client_approval', 'orange', true, true, 4, '2025-10-14T00:52:39.674627+00:00', '2025-10-14T00:52:39.674627+00:00', false),
  ('89f38c7e-df50-426e-887b-0450e33dac21', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Design Edits in Progress', 'design_edits_in_progress', 'purple', true, true, 5, '2025-10-14T00:52:39.674627+00:00', '2025-10-14T00:52:39.674627+00:00', false),
  ('3177e8f1-6a84-4479-ae53-c2c267796087', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Approved', 'approved', 'green', true, true, 6, '2025-10-14T00:52:39.674627+00:00', '2025-10-14T01:04:34.435625+00:00', true),
  ('4757c3c0-4efd-4dbd-a2ef-fa473aa67665', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Pending Design Instructions', 'pending_design_instructions', 'gray', true, false, 999, '2025-10-14T00:55:09.085142+00:00', '2025-10-14T00:55:09.085142+00:00', false)
ON CONFLICT (id) DO NOTHING;

-- Migrate core_task_templates (5 records)
INSERT INTO core_task_templates (id, tenant_id, task_name, display_order, is_active, created_at, updated_at)
VALUES
  ('8d656de9-abba-498b-adb0-3d5a65a93024', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Photo Strip Design Approval', 0, true, '2025-10-07T04:00:26.521687+00:00', '2025-10-07T04:00:26.521687+00:00'),
  ('723839b5-7f9e-4c4d-ac5b-7dae0e45a21e', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Event Staff Assigned', 1, true, '2025-10-07T04:00:26.521687+00:00', '2025-10-07T04:00:26.521687+00:00'),
  ('199bc454-b6a8-4501-86e6-688367ad8480', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Event Logistics Received', 2, true, '2025-10-07T04:00:26.521687+00:00', '2025-10-07T04:00:26.521687+00:00'),
  ('7f908a09-892c-4aa4-ad94-570b69766435', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Event Setup in Software', 3, true, '2025-10-07T04:00:26.521687+00:00', '2025-10-07T04:00:26.521687+00:00'),
  ('756008e2-f064-4cc9-b0d0-81f2c328de81', '5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Payment Received', 4, true, '2025-10-07T04:00:26.521687+00:00', '2025-10-07T04:00:26.521687+00:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS TO EVENTS TABLE
-- ============================================================================

-- Add foreign keys for event categories and types (now that data exists!)
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_event_category_id_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_event_category_id_fkey
  FOREIGN KEY (event_category_id)
  REFERENCES event_categories(id)
  ON DELETE SET NULL;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_event_type_id_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_event_type_id_fkey
  FOREIGN KEY (event_type_id)
  REFERENCES event_types(id)
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 5: RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Check row counts
SELECT 'event_categories' as table_name, COUNT(*) as count FROM event_categories
UNION ALL
SELECT 'event_types', COUNT(*) FROM event_types
UNION ALL
SELECT 'design_statuses', COUNT(*) FROM design_statuses
UNION ALL
SELECT 'core_task_templates', COUNT(*) FROM core_task_templates;

-- Test joins with events
SELECT 
    e.id,
    e.title,
    ec.name as category,
    et.name as type
FROM events e
LEFT JOIN event_categories ec ON e.event_category_id = ec.id
LEFT JOIN event_types et ON e.event_type_id = et.id
WHERE e.tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
LIMIT 5;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If you see counts above and events with categories/types, migration worked!
-- Next step: Re-enable the joins in src/app/api/events/route.ts
-- ============================================================================

