-- ============================================================================
-- CLEANUP INVALID FOREIGN KEY REFERENCES IN OPPORTUNITY_LINE_ITEMS
-- ============================================================================
-- This script fixes data integrity issues before adding FK constraints
-- Run this BEFORE running add-missing-business-table-fks.sql
-- ============================================================================

-- Step 1: Find and report invalid references
SELECT 
  'Invalid package_id references' as issue_type,
  COUNT(*) as count
FROM opportunity_line_items
WHERE package_id IS NOT NULL
  AND package_id NOT IN (SELECT id FROM packages);

SELECT 
  'Invalid add_on_id references' as issue_type,
  COUNT(*) as count
FROM opportunity_line_items
WHERE add_on_id IS NOT NULL
  AND add_on_id NOT IN (SELECT id FROM add_ons);

-- Step 2: Show the specific invalid records (for reference)
SELECT 
  id,
  opportunity_id,
  package_id,
  add_on_id,
  item_type,
  description,
  quantity,
  unit_price
FROM opportunity_line_items
WHERE (package_id IS NOT NULL AND package_id NOT IN (SELECT id FROM packages))
   OR (add_on_id IS NOT NULL AND add_on_id NOT IN (SELECT id FROM add_ons))
ORDER BY created_at DESC;

-- Step 3: Nullify invalid package_id references
UPDATE opportunity_line_items
SET package_id = NULL
WHERE package_id IS NOT NULL
  AND package_id NOT IN (SELECT id FROM packages);

-- Step 4: Nullify invalid add_on_id references
UPDATE opportunity_line_items
SET add_on_id = NULL
WHERE add_on_id IS NOT NULL
  AND add_on_id NOT IN (SELECT id FROM add_ons);

-- Step 5: Verify cleanup
SELECT 
  'Remaining invalid package_id' as check_type,
  COUNT(*) as count
FROM opportunity_line_items
WHERE package_id IS NOT NULL
  AND package_id NOT IN (SELECT id FROM packages);

SELECT 
  'Remaining invalid add_on_id' as check_type,
  COUNT(*) as count
FROM opportunity_line_items
WHERE add_on_id IS NOT NULL
  AND add_on_id NOT IN (SELECT id FROM add_ons);

-- Success message
SELECT '✅ Cleanup complete! You can now run add-missing-business-table-fks.sql' as status;

