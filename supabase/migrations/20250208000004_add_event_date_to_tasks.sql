-- Add event_date_id field to tasks table to support assigning tasks to specific event dates
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS event_date_id UUID REFERENCES event_dates(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_event_date_id ON tasks(event_date_id);

-- Add comment
COMMENT ON COLUMN tasks.event_date_id IS 'Specific event date this task is for (NULL = overall event task)';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
