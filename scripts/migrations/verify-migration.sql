-- Quick verification query - run this in Supabase SQL Editor

-- Check migration results
SELECT
  COUNT(*) as total_events,
  COUNT(event_category_id) as with_category,
  COUNT(event_type_id) as with_type,
  COUNT(*) FILTER (WHERE event_category_id IS NULL) as missing_category,
  COUNT(*) FILTER (WHERE event_type_id IS NULL) as missing_type
FROM events;

-- See what events were migrated and to what
SELECT
  e.title,
  e.event_type as old_event_type,
  ec.name as category_name,
  ec.color as category_color,
  et.name as type_name
FROM events e
LEFT JOIN event_categories ec ON e.event_category_id = ec.id
LEFT JOIN event_types et ON e.event_type_id = et.id
ORDER BY e.created_at DESC
LIMIT 10;

-- Check if any events still need migration
SELECT
  id,
  title,
  event_type as old_type,
  event_category_id,
  event_type_id
FROM events
WHERE event_category_id IS NULL OR event_type_id IS NULL
LIMIT 10;
