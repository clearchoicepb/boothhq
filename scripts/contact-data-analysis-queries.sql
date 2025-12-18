-- ============================================================================
-- CONTACT DATA LEGACY ANALYSIS QUERIES
-- Run these in your Supabase SQL Editor (tenant data database)
-- Replace 'YOUR_TENANT_ID' with your actual tenant_id
-- ============================================================================

-- Set your tenant ID here for convenience
-- DO $$ DECLARE tenant_id_var UUID := 'YOUR_TENANT_ID'; BEGIN END $$;

-- ============================================================================
-- SECTION 1: TOTAL COUNTS
-- ============================================================================

-- Total contacts
SELECT 'Total Contacts' as metric, COUNT(*) as count FROM contacts WHERE tenant_id = 'YOUR_TENANT_ID';

-- Total accounts
SELECT 'Total Accounts' as metric, COUNT(*) as count FROM accounts WHERE tenant_id = 'YOUR_TENANT_ID';

-- Total junction entries
SELECT 'Total Junction Entries' as metric, COUNT(*) as count FROM contact_accounts WHERE tenant_id = 'YOUR_TENANT_ID';

-- Total events
SELECT 'Total Events' as metric, COUNT(*) as count FROM events WHERE tenant_id = 'YOUR_TENANT_ID';

-- ============================================================================
-- SECTION 2: LEGACY CONTACTS (have account_id but NO junction entry)
-- This is the PRIMARY issue causing automation failures
-- ============================================================================

-- Count contacts with account_id but missing junction entry
SELECT
  'LEGACY: Contacts missing junction entry' as issue,
  COUNT(*) as count
FROM contacts c
WHERE c.tenant_id = 'YOUR_TENANT_ID'
  AND c.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contact_accounts ca
    WHERE ca.contact_id = c.id
      AND ca.account_id = c.account_id
      AND ca.tenant_id = 'YOUR_TENANT_ID'
  );

-- View the actual legacy contacts (first 20)
SELECT
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.account_id,
  c.created_at,
  'LEGACY: Has account_id but no junction entry' as issue
FROM contacts c
WHERE c.tenant_id = 'YOUR_TENANT_ID'
  AND c.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contact_accounts ca
    WHERE ca.contact_id = c.id
      AND ca.account_id = c.account_id
      AND ca.tenant_id = 'YOUR_TENANT_ID'
  )
ORDER BY c.created_at DESC
LIMIT 20;

-- ============================================================================
-- SECTION 3: ORPHANED CONTACTS (have junction entry but NO account_id)
-- ============================================================================

SELECT
  'ORPHANED: Contacts with junction but no account_id' as issue,
  COUNT(*) as count
FROM contacts c
WHERE c.tenant_id = 'YOUR_TENANT_ID'
  AND c.account_id IS NULL
  AND EXISTS (
    SELECT 1 FROM contact_accounts ca
    WHERE ca.contact_id = c.id
      AND ca.tenant_id = 'YOUR_TENANT_ID'
  );

-- ============================================================================
-- SECTION 4: LEGACY EVENTS (have contact_id but NO primary_contact_id)
-- ============================================================================

SELECT
  'LEGACY: Events with contact_id but no primary_contact_id' as issue,
  COUNT(*) as count
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NOT NULL
  AND primary_contact_id IS NULL;

-- View legacy events
SELECT
  id,
  title,
  contact_id,
  primary_contact_id,
  created_at,
  'LEGACY: Has contact_id but no primary_contact_id' as issue
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NOT NULL
  AND primary_contact_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- SECTION 5: NEW EVENTS (have primary_contact_id but NO contact_id)
-- These are fine but show the transition happened
-- ============================================================================

SELECT
  'NEW: Events with primary_contact_id but no contact_id' as issue,
  COUNT(*) as count
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NULL
  AND primary_contact_id IS NOT NULL;

-- ============================================================================
-- SECTION 6: EVENTS WITH BOTH CONTACT FIELDS (check mismatches)
-- ============================================================================

-- Events with both fields that MATCH (healthy)
SELECT
  'HEALTHY: Events with matching contact fields' as status,
  COUNT(*) as count
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NOT NULL
  AND primary_contact_id IS NOT NULL
  AND contact_id = primary_contact_id;

-- Events with both fields that DON'T match (problem)
SELECT
  'MISMATCH: Events with different contact_id and primary_contact_id' as issue,
  COUNT(*) as count
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NOT NULL
  AND primary_contact_id IS NOT NULL
  AND contact_id != primary_contact_id;

-- View mismatched events
SELECT
  id,
  title,
  contact_id,
  primary_contact_id,
  created_at
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NOT NULL
  AND primary_contact_id IS NOT NULL
  AND contact_id != primary_contact_id
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- SECTION 7: EVENTS WITH NO CONTACT
-- ============================================================================

SELECT
  'Events with no contact at all' as status,
  COUNT(*) as count
FROM events
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND contact_id IS NULL
  AND primary_contact_id IS NULL;

-- ============================================================================
-- SECTION 8: JUNCTION TABLE HEALTH
-- ============================================================================

-- Active vs ended relationships
SELECT
  CASE WHEN end_date IS NULL THEN 'Active' ELSE 'Ended' END as status,
  COUNT(*) as count
FROM contact_accounts
WHERE tenant_id = 'YOUR_TENANT_ID'
GROUP BY CASE WHEN end_date IS NULL THEN 'Active' ELSE 'Ended' END;

-- Contacts with multiple active account relationships
SELECT
  'Contacts with multiple active accounts' as metric,
  COUNT(DISTINCT contact_id) as count
FROM (
  SELECT contact_id, COUNT(*) as account_count
  FROM contact_accounts
  WHERE tenant_id = 'YOUR_TENANT_ID'
    AND end_date IS NULL
  GROUP BY contact_id
  HAVING COUNT(*) > 1
) multi_account_contacts;

-- ============================================================================
-- SUMMARY QUERY (all-in-one)
-- ============================================================================

SELECT 'SUMMARY' as section, '' as metric, 0 as count
UNION ALL
SELECT '---', '---', 0
UNION ALL
SELECT 'Legacy Issues', 'Contacts missing junction entry', (
  SELECT COUNT(*) FROM contacts c
  WHERE c.tenant_id = 'YOUR_TENANT_ID'
    AND c.account_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contact_accounts ca
      WHERE ca.contact_id = c.id AND ca.account_id = c.account_id
    )
)
UNION ALL
SELECT 'Legacy Issues', 'Events missing primary_contact_id', (
  SELECT COUNT(*) FROM events
  WHERE tenant_id = 'YOUR_TENANT_ID'
    AND contact_id IS NOT NULL
    AND primary_contact_id IS NULL
)
UNION ALL
SELECT 'Data Sync', 'Events with mismatched contacts', (
  SELECT COUNT(*) FROM events
  WHERE tenant_id = 'YOUR_TENANT_ID'
    AND contact_id IS NOT NULL
    AND primary_contact_id IS NOT NULL
    AND contact_id != primary_contact_id
)
UNION ALL
SELECT 'Healthy', 'Contacts with both ID and junction', (
  SELECT COUNT(*) FROM contacts c
  WHERE c.tenant_id = 'YOUR_TENANT_ID'
    AND c.account_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM contact_accounts ca
      WHERE ca.contact_id = c.id AND ca.account_id = c.account_id
    )
)
UNION ALL
SELECT 'Healthy', 'Events with synced contact fields', (
  SELECT COUNT(*) FROM events
  WHERE tenant_id = 'YOUR_TENANT_ID'
    AND contact_id IS NOT NULL
    AND primary_contact_id IS NOT NULL
    AND contact_id = primary_contact_id
);
