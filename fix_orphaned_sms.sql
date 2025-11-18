-- Backfill orphaned SMS communications with correct relationship IDs
-- This script finds communications with null contact_id/lead_id/account_id
-- and matches them by phone number from metadata

-- Function to normalize phone numbers (last 10 digits only)
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update communications with matching contacts
UPDATE communications c
SET 
  contact_id = matched.contact_id,
  account_id = matched.account_id
FROM (
  SELECT 
    c.id as comm_id,
    contacts.id as contact_id,
    contacts.account_id
  FROM communications c
  CROSS JOIN contacts
  WHERE 
    c.contact_id IS NULL 
    AND c.lead_id IS NULL
    AND c.account_id IS NULL
    AND c.metadata->>'to_number' IS NOT NULL
    AND contacts.phone IS NOT NULL
    AND normalize_phone(c.metadata->>'to_number') = normalize_phone(contacts.phone)
    AND c.tenant_id = contacts.tenant_id
) matched
WHERE c.id = matched.comm_id;

-- Update communications with matching leads
UPDATE communications c
SET lead_id = matched.lead_id
FROM (
  SELECT 
    c.id as comm_id,
    leads.id as lead_id
  FROM communications c
  CROSS JOIN leads
  WHERE 
    c.contact_id IS NULL 
    AND c.lead_id IS NULL
    AND c.account_id IS NULL
    AND c.metadata->>'to_number' IS NOT NULL
    AND leads.phone IS NOT NULL
    AND normalize_phone(c.metadata->>'to_number') = normalize_phone(leads.phone)
    AND c.tenant_id = leads.tenant_id
) matched
WHERE c.id = matched.comm_id;

-- Update communications with matching accounts (if still orphaned)
UPDATE communications c
SET account_id = matched.account_id
FROM (
  SELECT 
    c.id as comm_id,
    accounts.id as account_id
  FROM communications c
  CROSS JOIN accounts
  WHERE 
    c.contact_id IS NULL 
    AND c.lead_id IS NULL
    AND c.account_id IS NULL
    AND c.metadata->>'to_number' IS NOT NULL
    AND accounts.phone IS NOT NULL
    AND normalize_phone(c.metadata->>'to_number') = normalize_phone(accounts.phone)
    AND c.tenant_id = accounts.tenant_id
) matched
WHERE c.id = matched.comm_id;

-- Show results
SELECT 
  COUNT(*) FILTER (WHERE contact_id IS NOT NULL) as "Communications with Contact",
  COUNT(*) FILTER (WHERE lead_id IS NOT NULL) as "Communications with Lead",
  COUNT(*) FILTER (WHERE account_id IS NOT NULL) as "Communications with Account",
  COUNT(*) FILTER (WHERE contact_id IS NULL AND lead_id IS NULL AND account_id IS NULL) as "Still Orphaned"
FROM communications
WHERE communication_type = 'sms';

