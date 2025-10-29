-- Find opportunities stuck in custom stage
-- Run this query in your database to find the 3 opportunities

SELECT
  id,
  name,
  stage,
  amount,
  created_at,
  updated_at
FROM opportunities
WHERE stage = 'stage_1761253720446'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
ORDER BY created_at DESC;

-- Check if the custom stage exists in tenant_settings
SELECT
  setting_key,
  setting_value
FROM tenant_settings
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
  AND setting_key LIKE 'opportunities.stages%'
ORDER BY setting_key;

-- Get ALL opportunity settings to see what's stored
SELECT
  setting_key,
  setting_value
FROM tenant_settings
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
  AND setting_key LIKE 'opportunities%'
ORDER BY setting_key;
