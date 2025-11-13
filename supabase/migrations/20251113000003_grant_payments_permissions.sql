-- Grant permissions on payments table to Supabase roles
-- This fixes "permission denied for table payments" error (42501)
--
-- Background: The payments table was created but permissions were never granted
-- to the Supabase special roles (service_role, authenticated, anon).
-- Even with RLS disabled, PostgreSQL table-level permissions are still required.

-- Grant all permissions to service_role (used by API with service key)
GRANT ALL ON TABLE payments TO service_role;

-- Grant all permissions to authenticated users
GRANT ALL ON TABLE payments TO authenticated;

-- Grant all permissions to anonymous users (for public invoice payments)
GRANT ALL ON TABLE payments TO anon;

-- Verify grants (optional, for debugging)
-- Run this separately to check:
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'payments'
-- AND table_schema = 'public'
-- ORDER BY grantee, privilege_type;

COMMENT ON TABLE payments IS 'Payment records for invoices. Permissions granted to service_role, authenticated, and anon. RLS disabled - tenant isolation at application layer.';
