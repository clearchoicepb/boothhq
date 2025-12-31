-- ============================================================================
-- Fix task_template task_type values for proper filtering
--
-- Problem: The seed function created templates with specific task_type values
-- like 'follow_up_lead', 'send_quote', etc. But the unified task modal filters
-- by department-level task types: 'sales', 'design', 'operations', 'admin', etc.
--
-- This caused templates for Sales, Accounting, Customer Success, and Admin
-- departments to not appear in the template dropdown because the filter didn't match.
--
-- Design and Operations templates worked because their migrations set
-- task_type = 'design' and task_type = 'operations' respectively.
--
-- Solution: Update task_type to match the department for all templates where
-- the department is one of the unified task types.
-- ============================================================================

-- Update templates where department matches a unified task type
-- Unified task types: general, design, operations, sales, admin, accounting, customer_success, project, misc

-- For Sales department templates
UPDATE task_templates
SET task_type = 'sales'
WHERE department = 'sales'
  AND (task_type IS NULL OR task_type NOT IN ('sales', 'general', 'project', 'misc'));

-- For Admin department templates
UPDATE task_templates
SET task_type = 'admin'
WHERE department = 'admin'
  AND (task_type IS NULL OR task_type NOT IN ('admin', 'general', 'project', 'misc'));

-- For Accounting department templates
UPDATE task_templates
SET task_type = 'accounting'
WHERE department = 'accounting'
  AND (task_type IS NULL OR task_type NOT IN ('accounting', 'general', 'project', 'misc'));

-- For Customer Success department templates
UPDATE task_templates
SET task_type = 'customer_success'
WHERE department = 'customer_success'
  AND (task_type IS NULL OR task_type NOT IN ('customer_success', 'general', 'project', 'misc'));

-- Note: Design and Operations templates already have correct task_type from their migrations
-- But let's ensure any seed templates that slipped through are also updated

-- For Design department templates (backup fix for seed templates)
UPDATE task_templates
SET task_type = 'design'
WHERE department = 'design'
  AND task_type NOT IN ('design', 'general', 'project', 'misc')
  AND migrated_from_table IS NULL;

-- For Operations department templates (backup fix for seed templates)
UPDATE task_templates
SET task_type = 'operations'
WHERE department = 'operations'
  AND task_type NOT IN ('operations', 'general', 'project', 'misc')
  AND migrated_from_table IS NULL;

-- Log migration results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM task_templates
    WHERE task_type IN ('sales', 'admin', 'general', 'design', 'operations');

    RAISE NOTICE 'Task templates with unified task_type values: %', updated_count;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
