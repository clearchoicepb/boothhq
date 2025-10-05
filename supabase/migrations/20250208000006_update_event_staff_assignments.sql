-- Add new columns to event_staff_assignments
ALTER TABLE event_staff_assignments
  ADD COLUMN IF NOT EXISTS staff_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Create index for staff_role_id
CREATE INDEX IF NOT EXISTS idx_event_staff_role ON event_staff_assignments(staff_role_id);

-- Make the old 'role' column nullable since we're moving to staff_role_id
ALTER TABLE event_staff_assignments ALTER COLUMN role DROP NOT NULL;

-- Add comment explaining the time fields
COMMENT ON COLUMN event_staff_assignments.start_time IS 'Start time for event staff on this specific date (for event_staff type roles)';
COMMENT ON COLUMN event_staff_assignments.end_time IS 'End time for event staff on this specific date (for event_staff type roles)';
COMMENT ON COLUMN event_staff_assignments.staff_role_id IS 'Reference to staff_roles table defining the role type and category';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
