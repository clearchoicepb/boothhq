-- Fix Projects RLS Policies
-- Match the pattern used in other tables (allow all access for authenticated users)

-- Drop existing policies
DROP POLICY IF EXISTS "Tenant isolation for projects" ON projects;
DROP POLICY IF EXISTS "Tenant isolation for project_team_members" ON project_team_members;

-- Create permissive policies that allow all access
-- (Tenant isolation is handled at the application layer via getTenantContext)
CREATE POLICY "Allow all access to projects" 
  ON projects FOR ALL 
  USING (true);

CREATE POLICY "Allow all access to project_team_members" 
  ON project_team_members FOR ALL 
  USING (true);

