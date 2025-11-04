-- ============================================================================
-- ADD MISSING FOREIGN KEY CONSTRAINT TO ATTACHMENTS TABLE
-- ============================================================================
-- Purpose: Add foreign key relationship between attachments.uploaded_by and users.id
-- This enables Supabase to perform joins using the !uploaded_by syntax
-- Run this in: TENANT DATA DATABASE (not application database)
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY USERS TABLE EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'Users table does not exist in this database. Make sure you are running this in the TENANT DATA database, not the application database.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: DROP EXISTING CONSTRAINT IF IT EXISTS (idempotent)
-- ============================================================================

ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;

-- ============================================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key from attachments.uploaded_by to users.id
-- ON DELETE SET NULL: If a user is deleted, set uploaded_by to NULL instead of deleting the attachment
ALTER TABLE attachments
  ADD CONSTRAINT attachments_uploaded_by_fkey
  FOREIGN KEY (uploaded_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: RELOAD SCHEMA CACHE
-- ============================================================================

-- Notify PostgREST to reload the schema cache so joins work immediately
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Verify the constraint was created
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'attachments'
  AND kcu.column_name = 'uploaded_by';

-- Expected output:
-- constraint_name: attachments_uploaded_by_fkey
-- table_name: attachments
-- column_name: uploaded_by
-- foreign_table_name: users
-- foreign_column_name: id
-- delete_rule: SET NULL

-- ============================================================================
-- STEP 6: TEST QUERY (OPTIONAL)
-- ============================================================================

-- Test that the join syntax now works
-- This should return attachments with user information
SELECT
  a.id,
  a.file_name,
  a.uploaded_by,
  u.first_name,
  u.last_name,
  u.email
FROM attachments a
LEFT JOIN users u ON a.uploaded_by = u.id
LIMIT 5;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- The foreign key constraint is now in place.
-- The attachments API will now be able to use the join syntax:
--   uploaded_by_user:users!uploaded_by (first_name, last_name, email)
-- ============================================================================
