-- Migration: Add Department Support to Users and Tasks
-- Date: 2025-11-01
-- Purpose: Add department columns to users and tasks tables for the unified task management system
--
-- This migration adds:
-- 1. Department fields to users table
-- 2. Department fields to tasks table
-- 3. Performance indexes
-- 4. Task type field for department-specific task types
--
-- Design decisions:
-- - Using TEXT instead of ENUM for flexibility (departments can be added without schema migration)
-- - Nullable fields for backward compatibility
-- - Indexes on frequently queried columns
-- - No foreign key constraints (departments defined in application layer)

-- =============================================================================
-- USERS TABLE UPDATES
-- =============================================================================

-- Add department column to users
-- Stores which department the user belongs to (sales, design, operations, etc.)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department TEXT;

-- Add department_role column to users
-- Defines user's level within the department (member, supervisor, manager)
-- member: Regular team member, sees only their own tasks
-- supervisor: Can see all tasks in their department, can reassign
-- manager: Can see all departments, full access
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department_role TEXT DEFAULT 'member';

-- Add index for filtering users by department
CREATE INDEX IF NOT EXISTS idx_users_department
  ON users(department)
  WHERE department IS NOT NULL;

-- Add composite index for department + role queries
-- Used for finding supervisors/managers of a department
CREATE INDEX IF NOT EXISTS idx_users_department_role
  ON users(department, department_role)
  WHERE department IS NOT NULL AND department_role IS NOT NULL;

-- Add index for finding users by tenant and department (common query pattern)
CREATE INDEX IF NOT EXISTS idx_users_tenant_department
  ON users(tenant_id, department)
  WHERE department IS NOT NULL;

-- =============================================================================
-- TASKS TABLE UPDATES
-- =============================================================================

-- Add department column to tasks
-- Auto-assigned based on entity type or user's department
-- Allows filtering tasks by department in dashboards
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS department TEXT;

-- Add task_type column to tasks
-- References the department-specific task type (e.g., 'follow_up_lead', 'design_proof')
-- Defined in application layer (src/lib/departments.ts)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT;

-- Add index for filtering tasks by department
-- Critical for department dashboards showing all tasks for a department
CREATE INDEX IF NOT EXISTS idx_tasks_department
  ON tasks(department)
  WHERE department IS NOT NULL;

-- Add composite index for department + status
-- Common query: "Show all pending tasks for operations department"
CREATE INDEX IF NOT EXISTS idx_tasks_department_status
  ON tasks(department, status)
  WHERE department IS NOT NULL;

-- Add composite index for department + assigned user
-- Common query: "Show John's tasks in the design department"
CREATE INDEX IF NOT EXISTS idx_tasks_department_assigned
  ON tasks(department, assigned_to)
  WHERE department IS NOT NULL AND assigned_to IS NOT NULL;

-- Add composite index for department + due date
-- Used for finding overdue tasks by department
CREATE INDEX IF NOT EXISTS idx_tasks_department_due_date
  ON tasks(department, due_date)
  WHERE department IS NOT NULL AND due_date IS NOT NULL;

-- Add index for task_type lookups
CREATE INDEX IF NOT EXISTS idx_tasks_task_type
  ON tasks(task_type)
  WHERE task_type IS NOT NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

-- Add comments for documentation
COMMENT ON COLUMN users.department IS 'Department ID: sales, design, operations, customer_success, accounting, admin. Defined in application layer.';
COMMENT ON COLUMN users.department_role IS 'Role within department: member (default), supervisor (can manage team), manager (can manage all departments)';
COMMENT ON COLUMN tasks.department IS 'Department responsible for this task. Auto-assigned from entity type or user department.';
COMMENT ON COLUMN tasks.task_type IS 'Department-specific task type ID (e.g., follow_up_lead, design_proof). References DEPARTMENT_TASK_TYPES in application.';

-- =============================================================================
-- VALIDATION & NOTES
-- =============================================================================

-- Notes for developers:
-- 1. Department values are validated in application layer (src/lib/departments.ts)
-- 2. No CHECK constraints to allow flexible department additions
-- 3. Existing tasks will have NULL department - will be backfilled by application logic
-- 4. Existing users will have NULL department - should be assigned during onboarding flow
-- 5. Consider adding RLS policies if using Supabase RLS for department-based access control

-- Example RLS policy (commented out, add if needed):
-- CREATE POLICY "Users can see tasks in their department"
--   ON tasks FOR SELECT
--   USING (
--     department = (SELECT department FROM users WHERE id = auth.uid())
--     OR
--     (SELECT department_role FROM users WHERE id = auth.uid()) = 'manager'
--   );
