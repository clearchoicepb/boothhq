-- ============================================================================
-- Add sort_order column to invoice_line_items in TENANT DATA DATABASE
-- ============================================================================
-- IMPORTANT: Run this against your TENANT DATA DATABASE (not the app database)
--
-- This will enable drag/drop reordering of invoice line items.
-- The column was in the migration file but hasn't been applied yet.
-- ============================================================================

BEGIN;

-- Step 1: Add updated_at column if it doesn't exist (fixes trigger error)
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Add sort_order column if it doesn't exist
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Step 3: Update existing records to have sort_order based on created_at
-- This ensures existing items have a proper initial order
UPDATE invoice_line_items
SET sort_order = subquery.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY created_at) - 1 as row_num
  FROM invoice_line_items
  WHERE sort_order = 0 OR sort_order IS NULL
) AS subquery
WHERE invoice_line_items.id = subquery.id;

-- Step 4: Add index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_sort_order
  ON invoice_line_items(invoice_id, sort_order);

-- Step 5: Add index on invoice_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
  ON invoice_line_items(invoice_id);

COMMIT;

-- ============================================================================
-- Verification Query - Run this to confirm the migration worked
-- ============================================================================
SELECT
  'invoice_line_items' as table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'invoice_line_items'
  AND column_name IN ('sort_order', 'updated_at', 'invoice_id')
ORDER BY column_name;

-- Show sample data with sort_order
SELECT
  id,
  invoice_id,
  name,
  sort_order,
  created_at,
  updated_at
FROM invoice_line_items
ORDER BY invoice_id, sort_order
LIMIT 10;
