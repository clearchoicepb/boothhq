-- Run this in the Supabase SQL Editor for boothhq-tenant-data database

-- Check all opportunities
SELECT
  o.id,
  o.name as opportunity_name,
  o.stage,
  o.status,
  o.owner_id,
  o.tenant_id,
  o.created_at,
  a.name as account_name,
  c.first_name || ' ' || c.last_name as contact_name,
  l.first_name || ' ' || l.last_name as lead_name
FROM opportunities o
LEFT JOIN accounts a ON o.account_id = a.id
LEFT JOIN contacts c ON o.contact_id = c.id
LEFT JOIN leads l ON o.lead_id = l.id
ORDER BY o.created_at DESC;

-- Specifically search for Natalee Carter
SELECT
  o.id,
  o.name as opportunity_name,
  o.stage,
  o.status,
  o.owner_id,
  o.tenant_id,
  o.created_at,
  a.name as account_name,
  c.first_name || ' ' || c.last_name as contact_name,
  l.first_name || ' ' || l.last_name as lead_name
FROM opportunities o
LEFT JOIN accounts a ON o.account_id = a.id
LEFT JOIN contacts c ON o.contact_id = c.id
LEFT JOIN leads l ON o.lead_id = l.id
WHERE
  o.name ILIKE '%natalee%' OR o.name ILIKE '%carter%'
  OR a.name ILIKE '%natalee%' OR a.name ILIKE '%carter%'
  OR c.first_name ILIKE '%natalee%' OR c.first_name ILIKE '%carter%'
  OR c.last_name ILIKE '%natalee%' OR c.last_name ILIKE '%carter%'
  OR l.first_name ILIKE '%natalee%' OR l.first_name ILIKE '%carter%'
  OR l.last_name ILIKE '%natalee%' OR l.last_name ILIKE '%carter%';
