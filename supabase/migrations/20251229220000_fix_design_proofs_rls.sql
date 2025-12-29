-- ============================================
-- Fix RLS Policy for design_proofs Table
-- ============================================
--
-- PROBLEM: The design_proofs RLS policy uses:
--   current_setting('app.current_tenant_id', TRUE)::uuid
-- But this PostgreSQL session variable is never set by the application.
--
-- CONTEXT: The application uses service role (bypasses RLS) for all API operations
-- and handles tenant filtering in application code via getTenantContext().
-- RLS is not the primary security mechanism - it's a defense-in-depth layer.
--
-- SOLUTION: Use permissive policies (USING true) that allow authenticated access,
-- matching the pattern used in 20251222000000_fix_tenant_rls_policies.sql.
-- Tenant isolation is enforced at the application layer.
-- ============================================

-- ============================================
-- FIX: design_proofs RLS policy
-- ============================================
DROP POLICY IF EXISTS design_proofs_tenant_isolation ON design_proofs;

CREATE POLICY design_proofs_full_access ON design_proofs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON POLICY design_proofs_full_access ON design_proofs IS
  'Permissive policy - tenant isolation enforced at application layer via getTenantContext()';
