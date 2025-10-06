-- Create booth_assignments table (tracks booth deployment history)
CREATE TABLE IF NOT EXISTS booth_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- References
  booth_id UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Assignment dates
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_return_date TIMESTAMPTZ,
  actual_return_date TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status: pending, deployed, returned, cancelled

  -- Check-out tracking
  checked_out_by UUID REFERENCES users(id),
  checked_out_at TIMESTAMPTZ,
  checkout_notes TEXT,

  -- Check-in tracking
  checked_in_by UUID REFERENCES users(id),
  checked_in_at TIMESTAMPTZ,
  checkin_notes TEXT,

  -- Condition tracking
  items_missing TEXT[], -- Array of equipment item IDs
  items_damaged TEXT[], -- Array of equipment item IDs
  damage_notes TEXT,

  -- General notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_booth_assignments_tenant ON booth_assignments(tenant_id);
CREATE INDEX idx_booth_assignments_booth ON booth_assignments(booth_id);
CREATE INDEX idx_booth_assignments_event ON booth_assignments(event_id);
CREATE INDEX idx_booth_assignments_status ON booth_assignments(status);
CREATE INDEX idx_booth_assignments_dates ON booth_assignments(assigned_date, actual_return_date);

-- Enable RLS
ALTER TABLE booth_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view booth assignments in their tenant"
  ON booth_assignments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert booth assignments in their tenant"
  ON booth_assignments FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update booth assignments in their tenant"
  ON booth_assignments FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete booth assignments in their tenant"
  ON booth_assignments FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Add comments
COMMENT ON TABLE booth_assignments IS 'Tracks booth deployments to events with check-in/out history';
COMMENT ON COLUMN booth_assignments.items_missing IS 'Array of equipment item IDs not returned';
COMMENT ON COLUMN booth_assignments.items_damaged IS 'Array of equipment item IDs returned damaged';
