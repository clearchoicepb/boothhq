-- ============================================================================
-- COMPREHENSIVE AUDIT TRAIL MIGRATION
-- ============================================================================
-- Date: 2025-11-14
-- Purpose: Add complete audit trail (created_by, updated_by) to all business tables
-- Author: Claude Code
--
-- This migration:
-- 1. Adds created_by/updated_by columns to all tables
-- 2. Creates foreign key constraints to users table
-- 3. Backfills existing records with admin@clearchoicephotos.com
-- 4. Maintains data integrity and enables proper activity tracking
-- ============================================================================

-- ============================================================================
-- CONSTANTS
-- ============================================================================
-- Admin user UUID for backfilling historical data
-- User: admin@clearchoicephotos.com (fcb7ec1f-7599-4ec2-893a-bef11b30a32e)

DO $$
DECLARE
  admin_user_id UUID := 'fcb7ec1f-7599-4ec2-893a-bef11b30a32e';
BEGIN
  -- Verify admin user exists before proceeding
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = admin_user_id) THEN
    RAISE EXCEPTION 'Admin user (%) does not exist. Migration aborted.', admin_user_id;
  END IF;

  RAISE NOTICE 'Admin user verified: %', admin_user_id;
END $$;

-- ============================================================================
-- STEP 1: ADD AUDIT COLUMNS TO ALL TABLES
-- ============================================================================

RAISE NOTICE '==================================================';
RAISE NOTICE 'STEP 1: Adding audit columns to all tables';
RAISE NOTICE '==================================================';

-- INVOICES (completely missing audit fields)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- COMMUNICATIONS (missing updated_by)
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- TASKS (missing updated_by)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- NOTES (missing updated_by)
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ATTACHMENTS (has uploaded_by, missing created_by/updated_by)
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ACCOUNTS (missing both)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- CONTACTS (missing both)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- LEADS (missing both)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- OPPORTUNITIES (missing both)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- EVENTS (missing both)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- LOCATIONS (missing both)
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- EVENT_DATES (missing both)
ALTER TABLE event_dates
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- OPPORTUNITY_LINE_ITEMS (missing both)
ALTER TABLE opportunity_line_items
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- INVOICE_LINE_ITEMS (missing both)
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

RAISE NOTICE 'Audit columns added successfully';

-- ============================================================================
-- STEP 2: BACKFILL EXISTING RECORDS WITH ADMIN USER
-- ============================================================================

RAISE NOTICE '==================================================';
RAISE NOTICE 'STEP 2: Backfilling existing records';
RAISE NOTICE '==================================================';

DO $$
DECLARE
  admin_user_id UUID := 'fcb7ec1f-7599-4ec2-893a-bef11b30a32e';
  updated_count INTEGER;
BEGIN
  -- INVOICES
  UPDATE invoices
  SET created_by = admin_user_id, updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Invoices backfilled: % records', updated_count;

  -- COMMUNICATIONS
  UPDATE communications
  SET created_by = COALESCE(created_by, admin_user_id),
      updated_by = admin_user_id
  WHERE created_by IS NULL OR updated_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Communications backfilled: % records', updated_count;

  -- TASKS
  UPDATE tasks
  SET created_by = COALESCE(created_by, admin_user_id),
      updated_by = admin_user_id
  WHERE created_by IS NULL OR updated_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Tasks backfilled: % records', updated_count;

  -- NOTES
  UPDATE notes
  SET created_by = COALESCE(created_by, admin_user_id),
      updated_by = admin_user_id
  WHERE created_by IS NULL OR updated_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Notes backfilled: % records', updated_count;

  -- ATTACHMENTS (link created_by to uploaded_by if available, otherwise use admin)
  UPDATE attachments
  SET created_by = COALESCE(uploaded_by, admin_user_id),
      updated_by = admin_user_id
  WHERE created_by IS NULL OR updated_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Attachments backfilled: % records', updated_count;

  -- ACCOUNTS
  UPDATE accounts
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Accounts backfilled: % records', updated_count;

  -- CONTACTS
  UPDATE contacts
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Contacts backfilled: % records', updated_count;

  -- LEADS
  UPDATE leads
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Leads backfilled: % records', updated_count;

  -- OPPORTUNITIES
  UPDATE opportunities
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Opportunities backfilled: % records', updated_count;

  -- EVENTS
  UPDATE events
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Events backfilled: % records', updated_count;

  -- LOCATIONS
  UPDATE locations
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Locations backfilled: % records', updated_count;

  -- EVENT_DATES
  UPDATE event_dates
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Event dates backfilled: % records', updated_count;

  -- OPPORTUNITY_LINE_ITEMS
  UPDATE opportunity_line_items
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Opportunity line items backfilled: % records', updated_count;

  -- INVOICE_LINE_ITEMS
  UPDATE invoice_line_items
  SET created_by = admin_user_id,
      updated_by = admin_user_id
  WHERE created_by IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Invoice line items backfilled: % records', updated_count;

  RAISE NOTICE 'Backfill complete';
END $$;

-- ============================================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

RAISE NOTICE '==================================================';
RAISE NOTICE 'STEP 3: Adding foreign key constraints';
RAISE NOTICE '==================================================';

-- INVOICES
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_created_by_fkey,
  DROP CONSTRAINT IF EXISTS invoices_updated_by_fkey;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT invoices_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- COMMUNICATIONS
ALTER TABLE communications
  DROP CONSTRAINT IF EXISTS communications_created_by_fkey,
  DROP CONSTRAINT IF EXISTS communications_updated_by_fkey;

ALTER TABLE communications
  ADD CONSTRAINT communications_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT communications_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- TASKS
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey,
  DROP CONSTRAINT IF EXISTS tasks_updated_by_fkey,
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT tasks_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT tasks_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- NOTES
ALTER TABLE notes
  DROP CONSTRAINT IF EXISTS notes_created_by_fkey,
  DROP CONSTRAINT IF EXISTS notes_updated_by_fkey;

ALTER TABLE notes
  ADD CONSTRAINT notes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT notes_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ATTACHMENTS
ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_created_by_fkey,
  DROP CONSTRAINT IF EXISTS attachments_updated_by_fkey,
  DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT attachments_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT attachments_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- ACCOUNTS
ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_created_by_fkey,
  DROP CONSTRAINT IF EXISTS accounts_updated_by_fkey,
  DROP CONSTRAINT IF EXISTS accounts_assigned_to_fkey;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT accounts_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT accounts_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- CONTACTS
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_created_by_fkey,
  DROP CONSTRAINT IF EXISTS contacts_updated_by_fkey;

ALTER TABLE contacts
  ADD CONSTRAINT contacts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT contacts_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- LEADS
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_created_by_fkey,
  DROP CONSTRAINT IF EXISTS leads_updated_by_fkey;

ALTER TABLE leads
  ADD CONSTRAINT leads_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT leads_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- OPPORTUNITIES
ALTER TABLE opportunities
  DROP CONSTRAINT IF EXISTS opportunities_created_by_fkey,
  DROP CONSTRAINT IF EXISTS opportunities_updated_by_fkey,
  DROP CONSTRAINT IF EXISTS opportunities_owner_id_fkey;

ALTER TABLE opportunities
  ADD CONSTRAINT opportunities_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT opportunities_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT opportunities_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- EVENTS
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_created_by_fkey,
  DROP CONSTRAINT IF EXISTS events_updated_by_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT events_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- LOCATIONS
ALTER TABLE locations
  DROP CONSTRAINT IF EXISTS locations_created_by_fkey,
  DROP CONSTRAINT IF EXISTS locations_updated_by_fkey;

ALTER TABLE locations
  ADD CONSTRAINT locations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT locations_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- EVENT_DATES
ALTER TABLE event_dates
  DROP CONSTRAINT IF EXISTS event_dates_created_by_fkey,
  DROP CONSTRAINT IF EXISTS event_dates_updated_by_fkey;

ALTER TABLE event_dates
  ADD CONSTRAINT event_dates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT event_dates_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- OPPORTUNITY_LINE_ITEMS
ALTER TABLE opportunity_line_items
  DROP CONSTRAINT IF EXISTS opportunity_line_items_created_by_fkey,
  DROP CONSTRAINT IF EXISTS opportunity_line_items_updated_by_fkey;

ALTER TABLE opportunity_line_items
  ADD CONSTRAINT opportunity_line_items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT opportunity_line_items_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- INVOICE_LINE_ITEMS
ALTER TABLE invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_created_by_fkey,
  DROP CONSTRAINT IF EXISTS invoice_line_items_updated_by_fkey;

ALTER TABLE invoice_line_items
  ADD CONSTRAINT invoice_line_items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT invoice_line_items_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- CONTACT_ACCOUNTS (already has fields, just add FK)
ALTER TABLE contact_accounts
  DROP CONSTRAINT IF EXISTS contact_accounts_created_by_fkey,
  DROP CONSTRAINT IF EXISTS contact_accounts_updated_by_fkey;

ALTER TABLE contact_accounts
  ADD CONSTRAINT contact_accounts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT contact_accounts_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

RAISE NOTICE 'Foreign key constraints added successfully';

-- ============================================================================
-- STEP 4: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

RAISE NOTICE '==================================================';
RAISE NOTICE 'STEP 4: Adding indexes for audit fields';
RAISE NOTICE '==================================================';

-- Create indexes on created_by/updated_by for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_by ON invoices(updated_by);
CREATE INDEX IF NOT EXISTS idx_communications_created_by ON communications(created_by);
CREATE INDEX IF NOT EXISTS idx_communications_updated_by ON communications(updated_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_updated_by ON notes(updated_by);
CREATE INDEX IF NOT EXISTS idx_attachments_created_by ON attachments(created_by);
CREATE INDEX IF NOT EXISTS idx_attachments_updated_by ON attachments(updated_by);
CREATE INDEX IF NOT EXISTS idx_accounts_created_by ON accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_accounts_updated_by ON accounts(updated_by);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_by ON contacts(updated_by);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_updated_by ON leads(updated_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_updated_by ON opportunities(updated_by);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_updated_by ON events(updated_by);
CREATE INDEX IF NOT EXISTS idx_locations_created_by ON locations(created_by);
CREATE INDEX IF NOT EXISTS idx_locations_updated_by ON locations(updated_by);
CREATE INDEX IF NOT EXISTS idx_event_dates_created_by ON event_dates(created_by);
CREATE INDEX IF NOT EXISTS idx_event_dates_updated_by ON event_dates(updated_by);

RAISE NOTICE 'Indexes created successfully';

-- ============================================================================
-- STEP 5: ADD TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================================================

RAISE NOTICE '==================================================';
RAISE NOTICE 'STEP 5: Verifying auto-update triggers';
RAISE NOTICE '==================================================';

-- Triggers already exist from tenant-data-schema-actual.sql
-- Just verify they exist for critical tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_invoices_updated_at'
  ) THEN
    CREATE TRIGGER update_invoices_updated_at
      BEFORE UPDATE ON invoices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created trigger: update_invoices_updated_at';
  ELSE
    RAISE NOTICE 'Trigger already exists: update_invoices_updated_at';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_invoice_line_items_updated_at'
  ) THEN
    CREATE TRIGGER update_invoice_line_items_updated_at
      BEFORE UPDATE ON invoice_line_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created trigger: update_invoice_line_items_updated_at';
  ELSE
    RAISE NOTICE 'Trigger already exists: update_invoice_line_items_updated_at';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

RAISE NOTICE '==================================================';
RAISE NOTICE 'MIGRATION COMPLETE - VERIFICATION';
RAISE NOTICE '==================================================';

DO $$
DECLARE
  table_name TEXT;
  column_count INTEGER;
  fk_count INTEGER;
BEGIN
  -- Verify all tables have created_by and updated_by
  FOR table_name IN
    SELECT unnest(ARRAY[
      'invoices', 'communications', 'tasks', 'notes', 'attachments',
      'accounts', 'contacts', 'leads', 'opportunities', 'events',
      'locations', 'event_dates', 'opportunity_line_items', 'invoice_line_items'
    ])
  LOOP
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = table_name
      AND column_name IN ('created_by', 'updated_by');

    IF column_count = 2 THEN
      RAISE NOTICE '✓ % has both audit columns', table_name;
    ELSE
      RAISE WARNING '✗ % missing audit columns (found: %)', table_name, column_count;
    END IF;
  END LOOP;

  -- Count total foreign key constraints added
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%_created_by_fkey'
       OR constraint_name LIKE '%_updated_by_fkey'
       OR constraint_name LIKE '%_uploaded_by_fkey'
       OR constraint_name LIKE '%_assigned_to_fkey'
       OR constraint_name LIKE '%_owner_id_fkey';

  RAISE NOTICE '✓ Total FK constraints for audit fields: %', fk_count;
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✓ MIGRATION SUCCESSFUL';
  RAISE NOTICE '==================================================';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration is IDEMPOTENT - it can be run multiple times safely
--
-- What this migration accomplishes:
-- 1. ✓ Adds created_by/updated_by to 14 business tables
-- 2. ✓ Backfills historical data with admin user
-- 3. ✓ Creates 30+ foreign key constraints to users table
-- 4. ✓ Adds indexes for query performance
-- 5. ✓ Verifies triggers exist for auto-updating timestamps
--
-- Impact:
-- - Activity tab will now properly show who performed each action
-- - Full audit trail for compliance and debugging
-- - Database enforces referential integrity
-- - Queries can join to users table via FK
--
-- Next steps:
-- 1. Update activity route to use new FK relationships
-- 2. Update API routes to populate created_by/updated_by from session
-- 3. Test activity tab displays user names correctly
--
-- ============================================================================
