-- Add task tracking fields to events table for Design and Operations teams
-- This allows filtering events by incomplete tasks and team responsibility

-- Design Team Tasks
ALTER TABLE events
ADD COLUMN IF NOT EXISTS design_request_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS backdrop_design_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS props_design_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_approval_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS production_files_ready BOOLEAN DEFAULT false;

-- Operations Team Tasks
ALTER TABLE events
ADD COLUMN IF NOT EXISTS equipment_assigned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS venue_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_time_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_assigned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transportation_arranged BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN events.design_request_submitted IS 'Design team: Initial design request has been submitted by client';
COMMENT ON COLUMN events.backdrop_design_complete IS 'Design team: Backdrop design has been completed';
COMMENT ON COLUMN events.props_design_complete IS 'Design team: Props design has been completed';
COMMENT ON COLUMN events.client_approval_received IS 'Design team: Client has approved the designs';
COMMENT ON COLUMN events.production_files_ready IS 'Design team: Production files are ready for printing/fabrication';

COMMENT ON COLUMN events.equipment_assigned IS 'Operations team: Photo booth equipment has been assigned to this event';
COMMENT ON COLUMN events.venue_confirmed IS 'Operations team: Event venue details have been confirmed';
COMMENT ON COLUMN events.setup_time_scheduled IS 'Operations team: Setup time has been scheduled with venue';
COMMENT ON COLUMN events.staff_assigned IS 'Operations team: Staff members have been assigned to this event';
COMMENT ON COLUMN events.transportation_arranged IS 'Operations team: Transportation logistics have been arranged';

-- Create indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_events_design_tasks
ON events(design_request_submitted, backdrop_design_complete, props_design_complete, client_approval_received, production_files_ready)
WHERE design_request_submitted = false OR backdrop_design_complete = false OR props_design_complete = false OR client_approval_received = false OR production_files_ready = false;

CREATE INDEX IF NOT EXISTS idx_events_operations_tasks
ON events(equipment_assigned, venue_confirmed, setup_time_scheduled, staff_assigned, transportation_arranged)
WHERE equipment_assigned = false OR venue_confirmed = false OR setup_time_scheduled = false OR staff_assigned = false OR transportation_arranged = false;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
