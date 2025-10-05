-- Create event_staff_assignments table for managing staff assignments to events
CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relations
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date_id UUID REFERENCES event_dates(id) ON DELETE CASCADE, -- NULL means assigned to overall event

  -- Assignment details
  role VARCHAR(100), -- Job description/position for this assignment (e.g., "Event Coordinator", "Setup Crew", "Server")
  notes TEXT, -- Any assignment-specific notes

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate assignments of same user to same event/date
  UNIQUE(tenant_id, event_id, user_id, event_date_id)
);

-- Create indexes for performance
CREATE INDEX idx_event_staff_tenant_id ON event_staff_assignments(tenant_id);
CREATE INDEX idx_event_staff_event_id ON event_staff_assignments(event_id);
CREATE INDEX idx_event_staff_user_id ON event_staff_assignments(user_id);
CREATE INDEX idx_event_staff_event_date_id ON event_staff_assignments(event_date_id);
CREATE INDEX idx_event_staff_created_at ON event_staff_assignments(created_at DESC);

-- Enable RLS
ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation_event_staff ON event_staff_assignments
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_event_staff_assignments_updated_at
  BEFORE UPDATE ON event_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE event_staff_assignments IS 'Staff assignments to events and specific event dates';
COMMENT ON COLUMN event_staff_assignments.event_id IS 'The event this staff member is assigned to';
COMMENT ON COLUMN event_staff_assignments.user_id IS 'The user/staff member assigned';
COMMENT ON COLUMN event_staff_assignments.event_date_id IS 'Specific event date (NULL = assigned to overall event)';
COMMENT ON COLUMN event_staff_assignments.role IS 'Job description/position for this assignment';
COMMENT ON COLUMN event_staff_assignments.notes IS 'Assignment-specific notes or instructions';
