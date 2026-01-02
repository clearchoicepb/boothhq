-- Migration: create_duplicate_finder_functions.sql
-- Functions to find and check for potential duplicate contacts and accounts

-- Enable pg_trgm extension for similarity function (if not already enabled)
-- Note: This may require superuser privileges in some environments
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- Function: find_duplicate_contacts
-- Purpose: Find potential duplicate contact pairs
-- =====================================================
CREATE OR REPLACE FUNCTION find_duplicate_contacts(
  p_tenant_id UUID,
  p_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  contact_id_1 UUID,
  contact_id_2 UUID,
  contact_1_name TEXT,
  contact_2_name TEXT,
  contact_1_email TEXT,
  contact_2_email TEXT,
  contact_1_phone TEXT,
  contact_2_phone TEXT,
  match_score FLOAT,
  match_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH contact_pairs AS (
    SELECT
      c1.id as id1,
      c2.id as id2,
      TRIM(c1.first_name || ' ' || COALESCE(c1.last_name, '')) as name1,
      TRIM(c2.first_name || ' ' || COALESCE(c2.last_name, '')) as name2,
      c1.email as email1,
      c2.email as email2,
      c1.phone as phone1,
      c2.phone as phone2
    FROM contacts c1
    JOIN contacts c2 ON c1.id < c2.id  -- Avoid duplicate pairs and self-compare
    WHERE c1.tenant_id = p_tenant_id
      AND c2.tenant_id = p_tenant_id
  )
  SELECT
    cp.id1,
    cp.id2,
    cp.name1,
    cp.name2,
    cp.email1,
    cp.email2,
    cp.phone1,
    cp.phone2,
    -- Calculate match score
    (
      -- Email match (highest weight)
      CASE WHEN LOWER(NULLIF(TRIM(cp.email1), '')) = LOWER(NULLIF(TRIM(cp.email2), ''))
           AND cp.email1 IS NOT NULL AND cp.email1 != '' THEN 0.5 ELSE 0 END +
      -- Name match
      CASE WHEN LOWER(cp.name1) = LOWER(cp.name2) AND cp.name1 != '' THEN 0.3
           WHEN similarity(LOWER(cp.name1), LOWER(cp.name2)) > 0.6 THEN 0.2
           ELSE 0 END +
      -- Phone match (normalize by removing non-digits)
      CASE WHEN regexp_replace(cp.phone1, '[^0-9]', '', 'g') = regexp_replace(cp.phone2, '[^0-9]', '', 'g')
           AND cp.phone1 IS NOT NULL AND cp.phone1 != ''
           AND LENGTH(regexp_replace(cp.phone1, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END
    )::FLOAT as score,
    -- Build match reasons array
    ARRAY_REMOVE(ARRAY[
      CASE WHEN LOWER(NULLIF(TRIM(cp.email1), '')) = LOWER(NULLIF(TRIM(cp.email2), ''))
           AND cp.email1 IS NOT NULL AND cp.email1 != '' THEN 'Exact email match' END,
      CASE WHEN LOWER(cp.name1) = LOWER(cp.name2) AND cp.name1 != '' THEN 'Exact name match'
           WHEN similarity(LOWER(cp.name1), LOWER(cp.name2)) > 0.6 THEN 'Similar name' END,
      CASE WHEN regexp_replace(cp.phone1, '[^0-9]', '', 'g') = regexp_replace(cp.phone2, '[^0-9]', '', 'g')
           AND cp.phone1 IS NOT NULL AND cp.phone1 != ''
           AND LENGTH(regexp_replace(cp.phone1, '[^0-9]', '', 'g')) >= 7 THEN 'Same phone number' END
    ], NULL) as reasons
  FROM contact_pairs cp
  WHERE (
    CASE WHEN LOWER(NULLIF(TRIM(cp.email1), '')) = LOWER(NULLIF(TRIM(cp.email2), ''))
         AND cp.email1 IS NOT NULL AND cp.email1 != '' THEN 0.5 ELSE 0 END +
    CASE WHEN LOWER(cp.name1) = LOWER(cp.name2) AND cp.name1 != '' THEN 0.3
         WHEN similarity(LOWER(cp.name1), LOWER(cp.name2)) > 0.6 THEN 0.2
         ELSE 0 END +
    CASE WHEN regexp_replace(cp.phone1, '[^0-9]', '', 'g') = regexp_replace(cp.phone2, '[^0-9]', '', 'g')
         AND cp.phone1 IS NOT NULL AND cp.phone1 != ''
         AND LENGTH(regexp_replace(cp.phone1, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END
  ) >= p_threshold
  ORDER BY score DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: find_duplicate_accounts
-- Purpose: Find potential duplicate account pairs
-- =====================================================
CREATE OR REPLACE FUNCTION find_duplicate_accounts(
  p_tenant_id UUID,
  p_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  account_id_1 UUID,
  account_id_2 UUID,
  account_1_name TEXT,
  account_2_name TEXT,
  account_1_email TEXT,
  account_2_email TEXT,
  account_1_phone TEXT,
  account_2_phone TEXT,
  match_score FLOAT,
  match_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH account_pairs AS (
    SELECT
      a1.id as id1,
      a2.id as id2,
      a1.name as name1,
      a2.name as name2,
      a1.email as email1,
      a2.email as email2,
      a1.phone as phone1,
      a2.phone as phone2,
      a1.website as website1,
      a2.website as website2
    FROM accounts a1
    JOIN accounts a2 ON a1.id < a2.id
    WHERE a1.tenant_id = p_tenant_id
      AND a2.tenant_id = p_tenant_id
  )
  SELECT
    ap.id1,
    ap.id2,
    ap.name1,
    ap.name2,
    ap.email1,
    ap.email2,
    ap.phone1,
    ap.phone2,
    (
      -- Email match
      CASE WHEN LOWER(NULLIF(TRIM(ap.email1), '')) = LOWER(NULLIF(TRIM(ap.email2), ''))
           AND ap.email1 IS NOT NULL AND ap.email1 != '' THEN 0.4 ELSE 0 END +
      -- Name match
      CASE WHEN LOWER(ap.name1) = LOWER(ap.name2) THEN 0.3
           WHEN similarity(LOWER(ap.name1), LOWER(ap.name2)) > 0.6 THEN 0.2
           ELSE 0 END +
      -- Phone match
      CASE WHEN regexp_replace(ap.phone1, '[^0-9]', '', 'g') = regexp_replace(ap.phone2, '[^0-9]', '', 'g')
           AND ap.phone1 IS NOT NULL AND ap.phone1 != ''
           AND LENGTH(regexp_replace(ap.phone1, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END +
      -- Website match
      CASE WHEN LOWER(NULLIF(TRIM(ap.website1), '')) = LOWER(NULLIF(TRIM(ap.website2), ''))
           AND ap.website1 IS NOT NULL AND ap.website1 != '' THEN 0.1 ELSE 0 END
    )::FLOAT as score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN LOWER(NULLIF(TRIM(ap.email1), '')) = LOWER(NULLIF(TRIM(ap.email2), ''))
           AND ap.email1 IS NOT NULL AND ap.email1 != '' THEN 'Exact email match' END,
      CASE WHEN LOWER(ap.name1) = LOWER(ap.name2) THEN 'Exact name match'
           WHEN similarity(LOWER(ap.name1), LOWER(ap.name2)) > 0.6 THEN 'Similar name' END,
      CASE WHEN regexp_replace(ap.phone1, '[^0-9]', '', 'g') = regexp_replace(ap.phone2, '[^0-9]', '', 'g')
           AND ap.phone1 IS NOT NULL AND ap.phone1 != ''
           AND LENGTH(regexp_replace(ap.phone1, '[^0-9]', '', 'g')) >= 7 THEN 'Same phone number' END,
      CASE WHEN LOWER(NULLIF(TRIM(ap.website1), '')) = LOWER(NULLIF(TRIM(ap.website2), ''))
           AND ap.website1 IS NOT NULL AND ap.website1 != '' THEN 'Same website' END
    ], NULL) as reasons
  FROM account_pairs ap
  WHERE (
    CASE WHEN LOWER(NULLIF(TRIM(ap.email1), '')) = LOWER(NULLIF(TRIM(ap.email2), ''))
         AND ap.email1 IS NOT NULL AND ap.email1 != '' THEN 0.4 ELSE 0 END +
    CASE WHEN LOWER(ap.name1) = LOWER(ap.name2) THEN 0.3
         WHEN similarity(LOWER(ap.name1), LOWER(ap.name2)) > 0.6 THEN 0.2
         ELSE 0 END +
    CASE WHEN regexp_replace(ap.phone1, '[^0-9]', '', 'g') = regexp_replace(ap.phone2, '[^0-9]', '', 'g')
         AND ap.phone1 IS NOT NULL AND ap.phone1 != ''
         AND LENGTH(regexp_replace(ap.phone1, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END +
    CASE WHEN LOWER(NULLIF(TRIM(ap.website1), '')) = LOWER(NULLIF(TRIM(ap.website2), ''))
         AND ap.website1 IS NOT NULL AND ap.website1 != '' THEN 0.1 ELSE 0 END
  ) >= p_threshold
  ORDER BY score DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: check_contact_duplicates
-- Purpose: Check if a new/edited contact might be a duplicate
-- =====================================================
CREATE OR REPLACE FUNCTION check_contact_duplicates(
  p_tenant_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_exclude_id UUID DEFAULT NULL  -- Exclude this ID when editing
)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  match_score FLOAT,
  match_reasons TEXT[]
) AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  v_full_name := TRIM(COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, ''));

  RETURN QUERY
  SELECT
    c.id,
    TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) as name,
    c.email,
    c.phone,
    (
      CASE WHEN LOWER(NULLIF(TRIM(c.email), '')) = LOWER(NULLIF(TRIM(p_email), ''))
           AND p_email IS NOT NULL AND p_email != '' THEN 0.5 ELSE 0 END +
      CASE WHEN LOWER(TRIM(c.first_name || ' ' || COALESCE(c.last_name, ''))) = LOWER(v_full_name)
           AND v_full_name != '' THEN 0.3
           WHEN similarity(LOWER(TRIM(c.first_name || ' ' || COALESCE(c.last_name, ''))), LOWER(v_full_name)) > 0.6
           AND v_full_name != '' THEN 0.2
           ELSE 0 END +
      CASE WHEN regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
           AND p_phone IS NOT NULL AND p_phone != ''
           AND LENGTH(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END
    )::FLOAT as score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN LOWER(NULLIF(TRIM(c.email), '')) = LOWER(NULLIF(TRIM(p_email), ''))
           AND p_email IS NOT NULL AND p_email != '' THEN 'Exact email match' END,
      CASE WHEN LOWER(TRIM(c.first_name || ' ' || COALESCE(c.last_name, ''))) = LOWER(v_full_name)
           AND v_full_name != '' THEN 'Exact name match'
           WHEN similarity(LOWER(TRIM(c.first_name || ' ' || COALESCE(c.last_name, ''))), LOWER(v_full_name)) > 0.6
           AND v_full_name != '' THEN 'Similar name' END,
      CASE WHEN regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
           AND p_phone IS NOT NULL AND p_phone != ''
           AND LENGTH(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 7 THEN 'Same phone number' END
    ], NULL) as reasons
  FROM contacts c
  WHERE c.tenant_id = p_tenant_id
    AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
    AND (
      CASE WHEN LOWER(NULLIF(TRIM(c.email), '')) = LOWER(NULLIF(TRIM(p_email), ''))
           AND p_email IS NOT NULL AND p_email != '' THEN 0.5 ELSE 0 END +
      CASE WHEN LOWER(TRIM(c.first_name || ' ' || COALESCE(c.last_name, ''))) = LOWER(v_full_name)
           AND v_full_name != '' THEN 0.3
           WHEN similarity(LOWER(TRIM(c.first_name || ' ' || COALESCE(c.last_name, ''))), LOWER(v_full_name)) > 0.6
           AND v_full_name != '' THEN 0.2
           ELSE 0 END +
      CASE WHEN regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
           AND p_phone IS NOT NULL AND p_phone != ''
           AND LENGTH(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END
    ) >= 0.4
  ORDER BY score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: check_account_duplicates
-- Purpose: Check if a new/edited account might be a duplicate
-- =====================================================
CREATE OR REPLACE FUNCTION check_account_duplicates(
  p_tenant_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  account_id UUID,
  account_name TEXT,
  account_email TEXT,
  account_phone TEXT,
  match_score FLOAT,
  match_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.email,
    a.phone,
    (
      CASE WHEN LOWER(NULLIF(TRIM(a.email), '')) = LOWER(NULLIF(TRIM(p_email), ''))
           AND p_email IS NOT NULL AND p_email != '' THEN 0.4 ELSE 0 END +
      CASE WHEN LOWER(a.name) = LOWER(p_name) AND p_name IS NOT NULL AND p_name != '' THEN 0.4
           WHEN similarity(LOWER(a.name), LOWER(COALESCE(p_name, ''))) > 0.6
           AND p_name IS NOT NULL AND p_name != '' THEN 0.3
           ELSE 0 END +
      CASE WHEN regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
           AND p_phone IS NOT NULL AND p_phone != ''
           AND LENGTH(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END
    )::FLOAT as score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN LOWER(NULLIF(TRIM(a.email), '')) = LOWER(NULLIF(TRIM(p_email), ''))
           AND p_email IS NOT NULL AND p_email != '' THEN 'Exact email match' END,
      CASE WHEN LOWER(a.name) = LOWER(p_name) AND p_name IS NOT NULL AND p_name != '' THEN 'Exact name match'
           WHEN similarity(LOWER(a.name), LOWER(COALESCE(p_name, ''))) > 0.6
           AND p_name IS NOT NULL AND p_name != '' THEN 'Similar name' END,
      CASE WHEN regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
           AND p_phone IS NOT NULL AND p_phone != ''
           AND LENGTH(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 7 THEN 'Same phone number' END
    ], NULL) as reasons
  FROM accounts a
  WHERE a.tenant_id = p_tenant_id
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND (
      CASE WHEN LOWER(NULLIF(TRIM(a.email), '')) = LOWER(NULLIF(TRIM(p_email), ''))
           AND p_email IS NOT NULL AND p_email != '' THEN 0.4 ELSE 0 END +
      CASE WHEN LOWER(a.name) = LOWER(p_name) AND p_name IS NOT NULL AND p_name != '' THEN 0.4
           WHEN similarity(LOWER(a.name), LOWER(COALESCE(p_name, ''))) > 0.6
           AND p_name IS NOT NULL AND p_name != '' THEN 0.3
           ELSE 0 END +
      CASE WHEN regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
           AND p_phone IS NOT NULL AND p_phone != ''
           AND LENGTH(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 7 THEN 0.2 ELSE 0 END
    ) >= 0.4
  ORDER BY score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION find_duplicate_contacts IS 'Finds potential duplicate contact pairs within a tenant based on email, name, and phone similarity';
COMMENT ON FUNCTION find_duplicate_accounts IS 'Finds potential duplicate account pairs within a tenant based on email, name, phone, and website similarity';
COMMENT ON FUNCTION check_contact_duplicates IS 'Checks if a new/edited contact might be a duplicate of an existing contact';
COMMENT ON FUNCTION check_account_duplicates IS 'Checks if a new/edited account might be a duplicate of an existing account';
