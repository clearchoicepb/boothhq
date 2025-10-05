-- Disable RLS on event_staff_assignments table since we use NextAuth
-- Authorization is handled in the API layer via session checks
ALTER TABLE event_staff_assignments DISABLE ROW LEVEL SECURITY;

-- Drop the existing policy
DROP POLICY IF EXISTS tenant_isolation_event_staff ON event_staff_assignments;
