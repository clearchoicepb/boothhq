-- ============================================================================
-- Fix task_template and task timing data
--
-- Problem: task_timing should be automatically derived from due date config:
-- - days_before_event → task_timing = 'pre_event'
-- - days_after_event → task_timing = 'post_event'
-- - default_due_in_days (only) → task_timing = 'general'
--
-- But some templates have mismatched values, causing post-event tasks
-- to incorrectly be marked as "missed" when the event passes.
--
-- This migration:
-- 1. Syncs task_timing with due date configuration
-- 2. Fixes use_event_date flag to match
-- 3. Updates tasks that inherited wrong timing from templates
-- 4. Un-misses incorrectly marked tasks
-- ============================================================================

-- Templates with days_after_event should be post_event
UPDATE task_templates
SET task_timing = 'post_event'
WHERE days_after_event IS NOT NULL
  AND (task_timing IS NULL OR task_timing != 'post_event');

-- Templates with days_before_event should be pre_event
UPDATE task_templates
SET task_timing = 'pre_event'
WHERE days_before_event IS NOT NULL
  AND days_after_event IS NULL
  AND (task_timing IS NULL OR task_timing != 'pre_event');

-- Templates with only default_due_in_days should be general
UPDATE task_templates
SET task_timing = 'general'
WHERE days_before_event IS NULL
  AND days_after_event IS NULL
  AND default_due_in_days IS NOT NULL
  AND (task_timing IS NULL OR task_timing NOT IN ('general', 'pre_event'));

-- Fix use_event_date flag to match the due date config
UPDATE task_templates
SET use_event_date = true
WHERE (days_before_event IS NOT NULL OR days_after_event IS NOT NULL)
  AND (use_event_date IS NULL OR use_event_date = false);

UPDATE task_templates
SET use_event_date = false
WHERE days_before_event IS NULL
  AND days_after_event IS NULL
  AND use_event_date = true;

-- Fix existing TASKS that inherited wrong task_timing from templates
UPDATE tasks t
SET task_timing = tt.task_timing
FROM task_templates tt
WHERE t.task_template_id = tt.id
  AND t.task_timing != tt.task_timing;

-- Un-miss tasks that were incorrectly marked as missed
-- Post-event tasks should NEVER be marked as missed based on event date
UPDATE tasks
SET missed = false, missed_at = null
WHERE missed = true
  AND task_timing = 'post_event';

-- Also un-miss tasks with future due dates (data error - can't be missed if not yet due)
UPDATE tasks
SET missed = false, missed_at = null
WHERE missed = true
  AND due_date > CURRENT_DATE;

-- Log migration results
DO $$
DECLARE
    template_count INTEGER;
    task_count INTEGER;
    unmissed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count
    FROM task_templates
    WHERE task_timing = 'post_event';

    SELECT COUNT(*) INTO task_count
    FROM tasks
    WHERE task_timing = 'post_event';

    RAISE NOTICE 'Post-event templates: %, Post-event tasks: %', template_count, task_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
