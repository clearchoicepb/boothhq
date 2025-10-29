-- Find tenant_settings table or similar settings tables
-- Run this in BOTH Application DB and Tenant DB

-- 1. Check for any settings-related tables
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count,
    CASE
        WHEN table_name = 'tenant_settings' THEN '🎯 FOUND IT!'
        ELSE ''
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%setting%'
    OR table_name LIKE '%config%'
    OR table_name LIKE '%preference%'
  )
ORDER BY table_name;

-- 2. If tenant_settings exists, check row count
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_settings') THEN
        RAISE NOTICE '✅ tenant_settings TABLE EXISTS!';

        -- Show structure
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'tenant_settings'
        ORDER BY ordinal_position;

        -- Count rows
        SELECT
            COUNT(*) as total_rows,
            COUNT(DISTINCT tenant_id) as tenants_with_settings
        FROM tenant_settings;

    ELSE
        RAISE NOTICE '❌ tenant_settings TABLE DOES NOT EXIST';
    END IF;
END $$;

-- 3. Check if tenants table has a settings JSONB column
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND (
    column_name LIKE '%setting%'
    OR column_name LIKE '%config%'
    OR column_name LIKE '%preference%'
    OR data_type = 'jsonb'
  )
ORDER BY ordinal_position;

-- 4. If tenants has settings column, check for opportunity stages
SELECT
    id,
    name,
    subdomain,
    CASE
        WHEN settings IS NOT NULL THEN 'Has settings data'
        ELSE 'No settings'
    END as settings_status
FROM tenants
WHERE id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
