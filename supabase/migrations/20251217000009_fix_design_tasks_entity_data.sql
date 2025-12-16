-- ============================================================================
-- Fix design tasks that are missing entity_type/entity_id
--
-- Some tasks created after the initial migration but before the API fixes
-- may be missing entity_type and entity_id. This migration fixes them.
-- ============================================================================

-- Fix tasks that were migrated from event_design_items but missing entity_type
UPDATE tasks t
SET
  entity_type = 'event',
  entity_id = edi.event_id
FROM event_design_items edi
WHERE t.migrated_from_table = 'event_design_items'
AND t.migrated_from_id = edi.id
AND (t.entity_type IS NULL OR t.entity_id IS NULL);

-- Fix tasks that have task_type = 'design' but entity_type is null
-- These should be linked to their source design items if possible
UPDATE tasks t
SET
  entity_type = 'event',
  entity_id = edi.event_id
FROM event_design_items edi
WHERE t.task_type = 'design'
AND t.entity_type IS NULL
AND edi.task_id = t.id;

-- Log results
DO $$
DECLARE
    fixed_count INTEGER;
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count
    FROM tasks
    WHERE task_type = 'design'
    AND entity_type = 'event'
    AND entity_id IS NOT NULL;

    SELECT COUNT(*) INTO missing_count
    FROM tasks
    WHERE task_type = 'design'
    AND (entity_type IS NULL OR entity_id IS NULL);

    RAISE NOTICE 'Design tasks fix: % properly linked, % still missing entity data', fixed_count, missing_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
