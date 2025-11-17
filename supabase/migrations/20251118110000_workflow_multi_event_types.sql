-- ═══════════════════════════════════════════════════════════════════════════════
-- WORKFLOW MULTI-SELECT EVENT TYPES
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Allow workflows to trigger for multiple event types instead of just one.
--   This is more practical because many workflows apply to multiple event types
--   (e.g., all weddings need design items, all corporate events need X tasks).
--
-- CHANGES:
--   - Change event_type_id (single UUID) → event_type_ids (UUID array)
--   - Migrate existing data
--   - Update constraints and indexes
--
-- MULTI-TENANT:
--   *** RUN THIS IN THE TENANT DATABASE (NOT APPLICATION DB) ***
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Add new array column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS event_type_ids UUID[] DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Migrate existing data (convert single event_type_id to array)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE workflows
SET event_type_ids = ARRAY[event_type_id]
WHERE event_type_id IS NOT NULL
  AND event_type_ids = '{}'; -- Only migrate if not already migrated

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Drop old single event_type_id column (after migration)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflows
  DROP COLUMN IF EXISTS event_type_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Add constraint (must have at least one event type)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workflows
  ADD CONSTRAINT workflows_event_type_ids_not_empty 
  CHECK (array_length(event_type_ids, 1) > 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Add index for array queries (using GIN index for fast array lookups)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workflows_event_type_ids 
  ON workflows USING GIN (event_type_ids);

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN workflows.event_type_ids IS 
  'Array of event type UUIDs that trigger this workflow. 
   A workflow will execute when ANY of these event types are created.
   Uses GIN index for fast array containment queries (@> operator).';

COMMENT ON CONSTRAINT workflows_event_type_ids_not_empty ON workflows IS
  'Ensures workflow has at least one event type selected (array is not empty)';

