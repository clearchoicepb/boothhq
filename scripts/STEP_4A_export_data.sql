-- ============================================================================
-- DATA MIGRATION SCRIPT - STEP 4A: EXPORT DATA
-- ============================================================================
-- Purpose: Export existing data from APPLICATION database
-- Run this in: APPLICATION DATABASE (https://djeeircaeqdvfgkczrwx.supabase.co)
--
-- This script will display all your existing data in JSON format.
-- Copy the results - we'll use them in the next step.
-- ============================================================================

-- Set the tenant ID (your tenant UUID)
DO $$
BEGIN
  RAISE NOTICE 'Starting data export for tenant: 5f98f4c0-5254-4c61-8633-55ea049c7f18';
END $$;

-- ============================================================================
-- STEP 1: Export Accounts (13 records)
-- ============================================================================
SELECT
  '-- ACCOUNTS DATA' as export_section,
  COUNT(*) as record_count
FROM accounts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 2: Export Contacts (9 records)
-- ============================================================================
SELECT
  '-- CONTACTS DATA' as export_section,
  COUNT(*) as record_count
FROM contacts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 3: Export Contact-Account Relationships
-- ============================================================================
SELECT
  '-- CONTACT_ACCOUNTS DATA' as export_section,
  COUNT(*) as record_count
FROM contact_accounts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 4: Export Leads
-- ============================================================================
SELECT
  '-- LEADS DATA' as export_section,
  COUNT(*) as record_count
FROM leads
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 5: Export Opportunities (49 records)
-- ============================================================================
SELECT
  '-- OPPORTUNITIES DATA' as export_section,
  COUNT(*) as record_count
FROM opportunities
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 6: Export Opportunity Line Items
-- ============================================================================
SELECT
  '-- OPPORTUNITY_LINE_ITEMS DATA' as export_section,
  COUNT(*) as record_count
FROM opportunity_line_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 7: Export Locations
-- ============================================================================
SELECT
  '-- LOCATIONS DATA' as export_section,
  COUNT(*) as record_count
FROM locations
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 8: Export Events (6 records)
-- ============================================================================
SELECT
  '-- EVENTS DATA' as export_section,
  COUNT(*) as record_count
FROM events
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 9: Export Event Dates
-- ============================================================================
SELECT
  '-- EVENT_DATES DATA' as export_section,
  COUNT(*) as record_count
FROM event_dates
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 10: Export Related Event Tables
-- ============================================================================
SELECT
  '-- EVENT_STAFF_ASSIGNMENTS DATA' as export_section,
  COUNT(*) as record_count
FROM event_staff_assignments
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

SELECT
  '-- EVENT_DESIGN_ITEMS DATA' as export_section,
  COUNT(*) as record_count
FROM event_design_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

SELECT
  '-- EVENT_CUSTOM_ITEMS DATA' as export_section,
  COUNT(*) as record_count
FROM event_custom_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 11: Export Quotes
-- ============================================================================
SELECT
  '-- QUOTES DATA' as export_section,
  COUNT(*) as record_count
FROM quotes
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 12: Export Quote Line Items
-- ============================================================================
SELECT
  '-- QUOTE_LINE_ITEMS DATA' as export_section,
  COUNT(*) as record_count
FROM quote_line_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 13: Export Contracts
-- ============================================================================
SELECT
  '-- CONTRACTS DATA' as export_section,
  COUNT(*) as record_count
FROM contracts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 14: Export Invoices (0 records)
-- ============================================================================
SELECT
  '-- INVOICES DATA' as export_section,
  COUNT(*) as record_count
FROM invoices
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 15: Export Tasks
-- ============================================================================
SELECT
  '-- TASKS DATA' as export_section,
  COUNT(*) as record_count
FROM tasks
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 16: Export Notes
-- ============================================================================
SELECT
  '-- NOTES DATA' as export_section,
  COUNT(*) as record_count
FROM notes
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 17: Export Attachments
-- ============================================================================
SELECT
  '-- ATTACHMENTS DATA' as export_section,
  COUNT(*) as record_count
FROM attachments
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- STEP 18: Export Communications
-- ============================================================================
SELECT
  '-- COMMUNICATIONS DATA' as export_section,
  COUNT(*) as record_count
FROM communications
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT
  '=== EXPORT SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM accounts WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18') as accounts,
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18') as contacts,
  (SELECT COUNT(*) FROM opportunities WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18') as opportunities,
  (SELECT COUNT(*) FROM events WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18') as events,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18') as invoices;
