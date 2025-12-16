-- ============================================================================
-- PHASE 1C: Expand task status values for unified model
-- Design items have more statuses - tasks table now supports all
--
-- Previous statuses: pending, in_progress, completed, cancelled
-- New statuses: awaiting_approval, needs_revision, approved
-- ============================================================================

-- Drop the existing CHECK constraint on status
ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new CHECK constraint with expanded status values
ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN (
        'pending',
        'in_progress',
        'awaiting_approval',
        'needs_revision',
        'approved',
        'completed',
        'cancelled'
    ));

-- Update the status column comment to document all valid values
COMMENT ON COLUMN tasks.status IS 'Task status: pending, in_progress, awaiting_approval, needs_revision, approved, completed, cancelled';

-- Create a helper function to validate status transitions (optional but recommended)
CREATE OR REPLACE FUNCTION is_valid_task_status(status_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN status_value IN (
        'pending',
        'in_progress',
        'awaiting_approval',
        'needs_revision',
        'approved',
        'completed',
        'cancelled'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_valid_task_status IS 'Validates if a string is a valid task status';

-- Create a function to check if a status is "completed" (for queries)
CREATE OR REPLACE FUNCTION is_completed_task_status(status_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN status_value IN ('completed', 'approved');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_completed_task_status IS 'Returns true if status represents a completed state (completed or approved)';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
