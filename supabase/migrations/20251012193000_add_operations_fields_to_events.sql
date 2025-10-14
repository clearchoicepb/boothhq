-- Add operations tracking fields to events table
ALTER TABLE events
  -- Form submission tracking
  ADD COLUMN IF NOT EXISTS design_form_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS design_form_submitted_date DATE,
  ADD COLUMN IF NOT EXISTS logistics_form_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS logistics_form_submitted_date DATE,
  ADD COLUMN IF NOT EXISTS event_brief_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS event_brief_created_date DATE,

  -- Final preparation tracking
  ADD COLUMN IF NOT EXISTS final_confirmation_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_confirmation_sent_date DATE,
  ADD COLUMN IF NOT EXISTS staff_notified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS staff_notified_date DATE,

  -- Equipment & Setup (for future use)
  ADD COLUMN IF NOT EXISTS equipment_assigned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS equipment_assigned_date DATE,
  ADD COLUMN IF NOT EXISTS software_configured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS software_configured_date DATE,

  -- Venue details
  ADD COLUMN IF NOT EXISTS venue_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS venue_confirmed_date DATE,
  ADD COLUMN IF NOT EXISTS load_in_time TIME,
  ADD COLUMN IF NOT EXISTS setup_time TIME,
  ADD COLUMN IF NOT EXISTS venue_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS venue_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS venue_contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS event_planner_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS event_planner_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS event_planner_email VARCHAR(255);

-- Add indexes for operations queries
CREATE INDEX IF NOT EXISTS idx_events_design_form ON events(design_form_submitted);
CREATE INDEX IF NOT EXISTS idx_events_logistics_form ON events(logistics_form_submitted);
CREATE INDEX IF NOT EXISTS idx_events_final_confirmation ON events(final_confirmation_sent);
CREATE INDEX IF NOT EXISTS idx_events_staff_notified ON events(staff_notified);

-- Add comment
COMMENT ON COLUMN events.design_form_submitted IS 'Whether client has submitted design form (Social Events)';
COMMENT ON COLUMN events.logistics_form_submitted IS 'Whether client has submitted logistics form';
COMMENT ON COLUMN events.event_brief_created IS 'Whether event brief has been created (Marketing Events)';
COMMENT ON COLUMN events.final_confirmation_sent IS 'Whether final confirmation email was sent';
COMMENT ON COLUMN events.staff_notified IS 'Whether staff has been notified about this event';
