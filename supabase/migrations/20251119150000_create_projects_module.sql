-- Migration: Create projects module
-- Description: Projects for internal/external non-event work tracking
-- Date: 2025-11-19

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(50), -- 'design', 'operations', 'marketing', 'development', 'other'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Status/Stage
  status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'
  stage VARCHAR(100), -- Customizable: 'planning', 'in_design', 'review', 'implementation'
  
  -- Ownership
  owner_id UUID,
  department VARCHAR(50), -- 'design', 'operations', 'marketing', 'executive'
  
  -- Timeline
  start_date DATE,
  target_date DATE,
  completed_date DATE,
  
  -- Progress
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Optional Relations
  related_account_id UUID,
  related_event_id UUID,
  parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- ============================================================================
-- PROJECT TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50), -- 'lead', 'contributor', 'reviewer', 'observer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_target_date ON projects(target_date);
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user ON project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_team_tenant ON project_team_members(tenant_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies
-- Match the pattern used in other tables (opportunities, events, etc.)
CREATE POLICY "Tenant isolation for projects"
  ON projects FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Project Team Members RLS Policies  
CREATE POLICY "Tenant isolation for project_team_members"
  ON project_team_members FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE projects IS 'Projects for internal/external non-event work tracking';
COMMENT ON TABLE project_team_members IS 'Team members assigned to projects';
COMMENT ON COLUMN projects.project_type IS 'Type of project: design, operations, marketing, development, other';
COMMENT ON COLUMN projects.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN projects.status IS 'Current status: not_started, in_progress, on_hold, completed, cancelled';
COMMENT ON COLUMN projects.progress_percentage IS 'Completion percentage (0-100)';
COMMENT ON COLUMN project_team_members.role IS 'Team member role: lead, contributor, reviewer, observer';

