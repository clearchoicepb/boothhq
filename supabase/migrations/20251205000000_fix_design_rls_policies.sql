-- Fix RLS Policies for Design System Tables
--
-- PROBLEM: The design_item_types, event_design_items, and design_statuses tables
-- have RLS policies that use current_setting('app.current_tenant_id', TRUE)::UUID,
-- but this PostgreSQL session variable is never actually set by the application.
--
-- SOLUTION: Update the policies to use auth.jwt() ->> 'tenant_id' pattern,
-- which is the same pattern used by all other working tables in the system.
-- This leverages Supabase's built-in JWT authentication.

-- ============================================================================
-- FIX: design_item_types RLS policy
-- ============================================================================
DROP POLICY IF EXISTS design_item_types_tenant_isolation ON design_item_types;

CREATE POLICY design_item_types_tenant_isolation ON design_item_types
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ============================================================================
-- FIX: event_design_items RLS policy
-- ============================================================================
DROP POLICY IF EXISTS event_design_items_tenant_isolation ON event_design_items;

CREATE POLICY event_design_items_tenant_isolation ON event_design_items
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ============================================================================
-- FIX: design_statuses RLS policy
-- ============================================================================
DROP POLICY IF EXISTS design_statuses_tenant_isolation ON design_statuses;

CREATE POLICY design_statuses_tenant_isolation ON design_statuses
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ============================================================================
-- ADD: operations_item_types RLS (was missing - only had GRANT statements)
-- ============================================================================
ALTER TABLE operations_item_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operations_item_types_tenant_isolation ON operations_item_types;

CREATE POLICY operations_item_types_tenant_isolation ON operations_item_types
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ============================================================================
-- ADD: event_operations_items RLS (was missing - only had GRANT statements)
-- ============================================================================
ALTER TABLE event_operations_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_operations_items_tenant_isolation ON event_operations_items;

CREATE POLICY event_operations_items_tenant_isolation ON event_operations_items
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ============================================================================
-- FIX: tenant_settings RLS policy (in tenant DB)
-- Note: This table may exist in either DB, policy fix applies regardless
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_settings') THEN
    DROP POLICY IF EXISTS tenant_settings_tenant_isolation ON tenant_settings;

    CREATE POLICY tenant_settings_tenant_isolation ON tenant_settings
      FOR ALL
      USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION: List affected policies after migration
-- ============================================================================
-- Run this query to verify the policies were created correctly:
-- SELECT tablename, policyname, qual
-- FROM pg_policies
-- WHERE tablename IN ('design_item_types', 'event_design_items', 'design_statuses',
--                     'operations_item_types', 'event_operations_items', 'tenant_settings');
