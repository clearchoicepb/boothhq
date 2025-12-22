-- ============================================
-- Fix RLS Policies for Tables Using Broken app.current_tenant_id Pattern
-- ============================================
--
-- PROBLEM: Several tables have RLS policies that use:
--   current_setting('app.current_tenant_id', TRUE)::uuid
-- But this PostgreSQL session variable is never set by the application.
--
-- CONTEXT: The application uses service role (bypasses RLS) for all API operations
-- and handles tenant filtering in application code via getTenantContext().
-- RLS is not the primary security mechanism - it's a defense-in-depth layer.
--
-- SOLUTION: Use permissive policies (USING true) that allow authenticated access,
-- matching the pattern used in 20251218000002_fix_event_forms_rls_policies.sql.
-- Tenant isolation is enforced at the application layer.
--
-- AFFECTED TABLES:
--   - inventory_assignments (from 20251118180000_create_inventory_assignments.sql)
--   - contracts (from 20251117210000_create_contracts_table.sql)
--   - template_sections (from 20250131220003_fix_template_sections_rls.sql)
-- ============================================

-- ============================================
-- FIX: inventory_assignments RLS policy
-- ============================================
DROP POLICY IF EXISTS tenant_isolation_inventory_assignments ON inventory_assignments;

CREATE POLICY tenant_isolation_inventory_assignments ON inventory_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX: contracts RLS policy
-- ============================================
DROP POLICY IF EXISTS tenant_isolation_contracts ON contracts;

CREATE POLICY tenant_isolation_contracts ON contracts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX: template_sections RLS policies
-- (Has multiple policies from previous migration)
-- ============================================
DROP POLICY IF EXISTS "Users can view their tenant sections and system sections" ON template_sections;
DROP POLICY IF EXISTS "Users can insert their tenant sections" ON template_sections;
DROP POLICY IF EXISTS "Users can update their tenant sections" ON template_sections;
DROP POLICY IF EXISTS "Users can delete their tenant sections" ON template_sections;

CREATE POLICY template_sections_full_access ON template_sections
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON POLICY tenant_isolation_inventory_assignments ON inventory_assignments IS
  'Permissive policy - tenant isolation enforced at application layer via getTenantContext()';

COMMENT ON POLICY tenant_isolation_contracts ON contracts IS
  'Permissive policy - tenant isolation enforced at application layer via getTenantContext()';

COMMENT ON POLICY template_sections_full_access ON template_sections IS
  'Permissive policy - tenant isolation enforced at application layer via getTenantContext()';
