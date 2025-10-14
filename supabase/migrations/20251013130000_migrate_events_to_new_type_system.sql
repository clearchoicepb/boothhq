-- ═══════════════════════════════════════════════════════════
-- MIGRATION: Map old event_type TEXT values to new event_type_id and event_category_id
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Advisory lock to prevent concurrent execution
SELECT pg_advisory_xact_lock(864203_001);

DO $$
DECLARE
  tenant_record RECORD;
  social_category_id UUID;
  corporate_category_id UUID;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP

    -- Get category IDs for this tenant
    SELECT id INTO social_category_id
    FROM event_categories
    WHERE tenant_id = tenant_record.id AND slug = 'social-event';

    SELECT id INTO corporate_category_id
    FROM event_categories
    WHERE tenant_id = tenant_record.id AND slug = 'corporate-event';

    IF social_category_id IS NULL OR corporate_category_id IS NULL THEN
      RAISE NOTICE 'Tenant % is missing default categories. Skipping.', tenant_record.id;
      CONTINUE;
    END IF;

    -- Map weddings
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'wedding' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('wedding', 'weddings')
      AND e.event_type_id IS NULL;

    -- Map birthday parties
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'birthday-party' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('birthday', 'birthday_party', 'birthday party')
      AND e.event_type_id IS NULL;

    -- Map sweet 16
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'sweet-16' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('sweet 16', 'sweet-16', 'sweet16')
      AND e.event_type_id IS NULL;

    -- Map bar/bat mitzvah
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'bar-bat-mitzvah' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('bar mitzvah', 'bat mitzvah', 'bar/bat mitzvah', 'mitzvah')
      AND e.event_type_id IS NULL;

    -- Map quinceañera
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'quinceanera' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('quinceañera', 'quinceanera', 'quince')
      AND e.event_type_id IS NULL;

    -- Map graduations
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'graduation-party' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('graduation', 'graduation party', 'grad party')
      AND e.event_type_id IS NULL;

    -- Map holiday parties
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'holiday-party' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('holiday', 'holiday party', 'holiday_party', 'christmas', 'holiday event')
      AND e.event_type_id IS NULL;

    -- Map school dances
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'school-dance' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('school dance', 'prom', 'homecoming', 'dance')
      AND e.event_type_id IS NULL;

    -- Map corporate events
    UPDATE events e
    SET
      event_category_id = corporate_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'internal-corporate-event' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('corporate', 'corporate event', 'company event')
      AND e.event_type_id IS NULL;

    -- Map marketing activations
    UPDATE events e
    SET
      event_category_id = corporate_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'marketing-activation' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('marketing', 'marketing activation', 'activation')
      AND e.event_type_id IS NULL;

    -- Map conventions
    UPDATE events e
    SET
      event_category_id = corporate_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'convention' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('convention', 'expo', 'trade show')
      AND e.event_type_id IS NULL;

    -- Map conferences
    UPDATE events e
    SET
      event_category_id = corporate_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'conference' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('conference', 'summit', 'seminar')
      AND e.event_type_id IS NULL;

    -- Map photo_booth and misc social to "Misc Social Event"
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'misc-social-event' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND LOWER(e.event_type) IN ('photo_booth', 'photo booth', 'other', 'party', 'social', 'celebration')
      AND e.event_type_id IS NULL;

    -- Map everything else to "Misc Social Event" as default
    UPDATE events e
    SET
      event_category_id = social_category_id,
      event_type_id = (SELECT id FROM event_types WHERE tenant_id = tenant_record.id AND slug = 'misc-social-event' LIMIT 1)
    WHERE e.tenant_id = tenant_record.id
      AND e.event_type_id IS NULL
      AND e.event_type IS NOT NULL
      AND e.event_type != '';

    RAISE NOTICE 'Migrated events for tenant: %', tenant_record.id;
  END LOOP;
END $$;

-- Report migration results
DO $$
DECLARE
  total_events INTEGER;
  events_with_new_type INTEGER;
  events_still_unmigrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_events FROM events;
  SELECT COUNT(*) INTO events_with_new_type FROM events WHERE event_type_id IS NOT NULL;
  events_still_unmigrated := total_events - events_with_new_type;

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total events: %', total_events;
  RAISE NOTICE 'Events with new type: %', events_with_new_type;
  RAISE NOTICE 'Events still unmigrated: %', events_still_unmigrated;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
