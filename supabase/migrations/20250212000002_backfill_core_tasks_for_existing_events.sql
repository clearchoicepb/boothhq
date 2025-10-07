-- Backfill core task completions for all existing events
-- This migration initializes core task completion records for events that existed before the core tasks system

DO $$
DECLARE
  event_record RECORD;
  template_record RECORD;
BEGIN
  -- Loop through all existing events
  FOR event_record IN
    SELECT id, tenant_id FROM events
  LOOP
    -- For each event, insert completion records for all active core task templates
    FOR template_record IN
      SELECT id FROM core_task_templates
      WHERE tenant_id = event_record.tenant_id AND is_active = true
    LOOP
      -- Insert only if not already exists (idempotent)
      INSERT INTO event_core_task_completion (tenant_id, event_id, core_task_template_id, is_completed)
      VALUES (event_record.tenant_id, event_record.id, template_record.id, false)
      ON CONFLICT (event_id, core_task_template_id) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Core task completions backfilled for all existing events';
END $$;
