-- Migration: Add project_id to tasks table
-- Date: 2025-12-16
-- Purpose: Add direct foreign key relationship between tasks and projects
--
-- This allows project tasks to use a proper FK (project_id) instead of
-- the generic entity_type/entity_id pattern used for events/opportunities.
--
-- Projects are internal work items (like Asana tasks), distinct from
-- customer-facing Events which have specific dates.

-- Add project_id column with FK constraint
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add index for efficient project task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON tasks(project_id)
  WHERE project_id IS NOT NULL;

-- Add composite index for tenant + project queries
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_project
  ON tasks(tenant_id, project_id)
  WHERE project_id IS NOT NULL;

-- Add composite index for project + status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
  ON tasks(project_id, status)
  WHERE project_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tasks.project_id IS 'Direct FK to projects table. Used for internal project tasks (instead of entity_type/entity_id pattern).';
