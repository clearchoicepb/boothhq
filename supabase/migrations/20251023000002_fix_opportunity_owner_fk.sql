-- ═══════════════════════════════════════════════════════════════
-- FIX OPPORTUNITY OWNER FOREIGN KEY
-- 
-- ISSUE: owner_id references auth.users but app uses public.users
-- FIX: Change FK to reference public.users table
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Drop the incorrect foreign key constraint
ALTER TABLE opportunities 
DROP CONSTRAINT IF EXISTS opportunities_owner_id_fkey;

-- STEP 2: Add correct foreign key constraint
-- References public.users (not auth.users)
-- ON DELETE SET NULL (don't cascade delete opportunities if user deleted)
ALTER TABLE opportunities
ADD CONSTRAINT opportunities_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- STEP 3: Create index for performance (if doesn't exist)
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id 
ON opportunities(owner_id);

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- Run this to verify the constraint is correct
-- ═══════════════════════════════════════════════════════════════

/*
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conname = 'opportunities_owner_id_fkey';

-- Expected result:
-- constraint_name: opportunities_owner_id_fkey
-- table_name: opportunities
-- referenced_table: users  (should be 'users', NOT 'auth.users')
-- column_name: owner_id
-- referenced_column: id
*/

