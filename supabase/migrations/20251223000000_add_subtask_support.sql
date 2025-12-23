-- ============================================================================
-- Migration: Add Subtask Support to Tasks Table
-- Date: 2025-12-23
-- Purpose: Enable parent-child task relationships for subtasks
--
-- Design Decisions:
-- 1. Self-referential approach (parent_task_id on same table)
-- 2. Only ONE level deep - subtasks cannot have subtasks
-- 3. Subtasks inherit tenant_id from parent (enforced in app layer)
-- 4. Cascade delete - deleting parent removes all subtasks
-- 5. Display order for manual subtask ordering
--
-- See: docs/SUBTASK_IMPLEMENTATION_PLAN.md
-- ============================================================================

-- =============================================================================
-- COLUMN ADDITIONS
-- =============================================================================

-- Add parent_task_id for subtask hierarchy
-- NULL = top-level task, NOT NULL = subtask
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID;

-- Add display_order for ordering subtasks within a parent
-- Default 0, increment for each subtask
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- =============================================================================
-- FOREIGN KEY CONSTRAINT
-- =============================================================================

-- Add FK constraint (separate statement for cleaner error handling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_parent_task_id_fkey'
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_parent_task_id_fkey
      FOREIGN KEY (parent_task_id)
      REFERENCES tasks(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- ONE-LEVEL-DEEP CONSTRAINT (TRIGGER)
-- =============================================================================

-- Function to enforce single-level subtask hierarchy
-- Prevents: task -> subtask -> sub-subtask (not allowed)
-- Allows:   task -> subtask (allowed)
CREATE OR REPLACE FUNCTION enforce_single_level_subtasks()
RETURNS TRIGGER AS $$
BEGIN
  -- If this task has a parent_task_id, ensure the parent is not itself a subtask
  IF NEW.parent_task_id IS NOT NULL THEN
    -- Check if the parent task has its own parent
    IF EXISTS (
      SELECT 1 FROM tasks
      WHERE id = NEW.parent_task_id
      AND parent_task_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Nested subtasks are not allowed. A subtask cannot have subtasks.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_single_level_subtasks_trigger ON tasks;

CREATE TRIGGER enforce_single_level_subtasks_trigger
  BEFORE INSERT OR UPDATE OF parent_task_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_level_subtasks();

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for fetching all subtasks of a parent task
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Composite index for ordered subtask retrieval (common query pattern)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_display_order
  ON tasks(parent_task_id, display_order)
  WHERE parent_task_id IS NOT NULL;

-- Index for counting subtasks per parent (for badge display)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_status
  ON tasks(parent_task_id, status)
  WHERE parent_task_id IS NOT NULL;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task ID for subtasks. NULL = top-level task. Only one level of nesting allowed.';
COMMENT ON COLUMN tasks.display_order IS 'Display order for subtasks within a parent. Lower numbers appear first. Default 0.';
COMMENT ON FUNCTION enforce_single_level_subtasks() IS 'Trigger function that prevents nested subtasks (only one level deep allowed).';

-- =============================================================================
-- SCHEMA RELOAD
-- =============================================================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
