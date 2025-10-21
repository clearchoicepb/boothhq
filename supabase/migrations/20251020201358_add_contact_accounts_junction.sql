-- ============================================================================
-- Migration: Add Many-to-Many Contact-Account Relationships + Event Planner
-- Date: 2025-01-20
-- Description: 
--   1. Create contact_accounts junction table for many-to-many relationships
--   2. Add role-based relationships (Employee, Event Planner, Former, etc.)
--   3. Add event_planner_id to events table
--   4. Migrate existing data
-- ============================================================================

-- PART 1: Create Junction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Keys
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Relationship Metadata
  role text, -- "Primary Contact", "Event Planner", "Employee", "Billing Contact", "Former Employee", etc.
  is_primary boolean DEFAULT false, -- One account should be marked as primary per contact
  
  -- Time Tracking
  start_date date, -- When this relationship started
  end_date date, -- When ended (NULL = current/active relationship)
  
  -- Notes
  notes text, -- Additional context about this relationship
  
  -- Audit Fields
  tenant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  
  -- Constraints
  UNIQUE(contact_id, account_id), -- Prevent duplicate relationships
  CHECK (is_primary = false OR end_date IS NULL) -- Primary relationships must be active
);

-- Indexes for Performance
CREATE INDEX idx_contact_accounts_contact ON contact_accounts(contact_id);
CREATE INDEX idx_contact_accounts_account ON contact_accounts(account_id);
CREATE INDEX idx_contact_accounts_tenant ON contact_accounts(tenant_id);
CREATE INDEX idx_contact_accounts_primary ON contact_accounts(contact_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_contact_accounts_active ON contact_accounts(contact_id, account_id) WHERE end_date IS NULL;

-- Enable RLS
ALTER TABLE contact_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contact_accounts in their tenant"
  ON contact_accounts FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert contact_accounts in their tenant"
  ON contact_accounts FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update contact_accounts in their tenant"
  ON contact_accounts FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete contact_accounts in their tenant"
  ON contact_accounts FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

-- Updated At Trigger
CREATE TRIGGER update_contact_accounts_updated_at
  BEFORE UPDATE ON contact_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PART 2: Migrate Existing Contact-Account Data
-- ============================================================================

-- Migrate all existing contacts.account_id to junction table
-- Mark these as "Primary Contact" and is_primary = true
INSERT INTO contact_accounts (
  contact_id, 
  account_id, 
  role, 
  is_primary, 
  tenant_id,
  start_date,
  created_at
)
SELECT 
  c.id as contact_id,
  c.account_id,
  'Primary Contact' as role,
  true as is_primary,
  c.tenant_id,
  c.created_at::date as start_date, -- Use contact creation date as relationship start
  now() as created_at
FROM contacts c
WHERE c.account_id IS NOT NULL
ON CONFLICT (contact_id, account_id) DO NOTHING; -- Skip if already exists

-- PART 3: Enhance Events Table
-- ============================================================================

-- Add new columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES contacts(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_planner_id uuid REFERENCES contacts(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_primary_contact ON events(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_events_event_planner ON events(event_planner_id);

-- Migrate existing events.contact_id to primary_contact_id
UPDATE events 
SET primary_contact_id = contact_id 
WHERE contact_id IS NOT NULL 
  AND primary_contact_id IS NULL;

-- PART 4: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE contact_accounts IS 'Junction table for many-to-many relationships between contacts and accounts. Supports roles like Employee, Event Planner, Former Employee, etc.';
COMMENT ON COLUMN contact_accounts.role IS 'The role this contact has at this account (Primary Contact, Event Planner, Employee, Billing Contact, Former Employee, etc.)';
COMMENT ON COLUMN contact_accounts.is_primary IS 'Whether this is the primary account for this contact. Each contact should have one primary account.';
COMMENT ON COLUMN contact_accounts.start_date IS 'When this relationship started (e.g., hire date, first event coordinated)';
COMMENT ON COLUMN contact_accounts.end_date IS 'When this relationship ended (NULL = still active). Used for Former Employee tracking.';

COMMENT ON COLUMN events.primary_contact_id IS 'The main decision maker / contact for this event at the paying account';
COMMENT ON COLUMN events.event_planner_id IS 'External event planner (e.g., wedding planner, corporate event coordinator) who coordinated this event';

-- PART 5: Create Helper Functions (Optional but Recommended)
-- ============================================================================

-- Function: Get all active accounts for a contact
CREATE OR REPLACE FUNCTION get_contact_active_accounts(contact_uuid uuid)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  role text,
  is_primary boolean,
  start_date date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    ca.role,
    ca.is_primary,
    ca.start_date
  FROM contact_accounts ca
  JOIN accounts a ON ca.account_id = a.id
  WHERE ca.contact_id = contact_uuid
    AND ca.end_date IS NULL
  ORDER BY ca.is_primary DESC, ca.start_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get contact's total event count across all accounts
CREATE OR REPLACE FUNCTION get_contact_total_events(contact_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM events
    WHERE primary_contact_id = contact_uuid
       OR event_planner_id = contact_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Get contact's total value across all accounts
CREATE OR REPLACE FUNCTION get_contact_total_value(contact_uuid uuid)
RETURNS numeric AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(estimated_value), 0)
    FROM events
    WHERE primary_contact_id = contact_uuid
       OR event_planner_id = contact_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE!
-- 
-- Next Steps:
-- 1. Test this migration in development environment first
-- 2. Verify data migrated correctly
-- 3. Update API queries to use contact_accounts table
-- 4. Update UI components to support many-to-many
-- ============================================================================

