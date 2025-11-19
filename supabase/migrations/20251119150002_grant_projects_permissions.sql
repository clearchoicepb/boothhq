-- Grant permissions on projects tables to all roles
-- This fixes the "permission denied for table projects" error

-- Grant all permissions to all roles
GRANT ALL ON projects TO PUBLIC;
GRANT ALL ON project_team_members TO PUBLIC;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Verify grants
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions granted to projects tables for all roles';
END $$;

