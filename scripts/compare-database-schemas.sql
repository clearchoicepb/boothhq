-- Compare Database Schemas
-- Run this in BOTH Application DB and Tenant DB to compare

-- ============================
-- PART 1: List All Tables
-- ============================
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE '_%'
    AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
ORDER BY table_name;

-- ============================
-- PART 2: Tables with tenant_id
-- ============================
SELECT DISTINCT
    t.table_name,
    c.column_name,
    c.data_type,
    (
        SELECT COUNT(*)
        FROM information_schema.columns c2
        WHERE c2.table_schema = 'public'
            AND c2.table_name = t.table_name
    ) as column_count
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_name NOT LIKE 'pg_%'
ORDER BY t.table_name;

-- ============================
-- PART 3: Get Row Counts
-- ============================
-- For tables with tenant_id, check row counts
-- You'll need to run this for each table individually:

-- SELECT 'tablename' as table_name, COUNT(*) as row_count FROM tablename;

-- ============================
-- PART 4: Detailed Schema Info
-- ============================
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT LIKE '_%'
ORDER BY t.table_name, c.ordinal_position;

