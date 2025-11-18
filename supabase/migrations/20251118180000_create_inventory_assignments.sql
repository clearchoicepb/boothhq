-- Create inventory_assignments table to track partial quantity assignments
-- This allows tracking when a subset of quantity-tracked inventory is assigned to events/users

CREATE TABLE IF NOT EXISTS inventory_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- What's being assigned
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_assigned INTEGER NOT NULL DEFAULT 1,
  
  -- Where it's assigned
  assigned_to_type VARCHAR(50) NOT NULL CHECK (assigned_to_type IN ('event', 'user', 'location')),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  physical_address_id UUID REFERENCES physical_addresses(id) ON DELETE SET NULL,
  
  -- Assignment details
  assignment_type VARCHAR(50) DEFAULT 'event_checkout' CHECK (assignment_type IN ('event_checkout', 'long_term_staff', 'warehouse', 'temporary')),
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_return_date DATE,
  actual_return_date DATE,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'checked_out', 'in_use', 'returned', 'cancelled')),
  prep_status VARCHAR(50) DEFAULT 'needs_prep' CHECK (prep_status IN ('needs_prep', 'prepped', 'checked', 'packed')),
  
  -- Notes and metadata
  notes TEXT,
  condition_notes TEXT,
  metadata JSONB,
  
  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_assignment_target CHECK (
    (assigned_to_type = 'event' AND event_id IS NOT NULL) OR
    (assigned_to_type = 'user' AND user_id IS NOT NULL) OR
    (assigned_to_type = 'location' AND physical_address_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_tenant_id ON inventory_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_inventory_item_id ON inventory_assignments(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_event_id ON inventory_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_user_id ON inventory_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_status ON inventory_assignments(status);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_assigned_date ON inventory_assignments(assigned_date DESC);

-- Enable RLS
ALTER TABLE inventory_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_inventory_assignments ON inventory_assignments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_inventory_assignments_updated_at
  BEFORE UPDATE ON inventory_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE inventory_assignments IS 'Tracks partial quantity assignments of inventory items to events, users, or locations';
COMMENT ON COLUMN inventory_assignments.quantity_assigned IS 'Number of units assigned (for quantity-tracked items, otherwise 1)';
COMMENT ON COLUMN inventory_assignments.assigned_to_type IS 'Type of assignment target: event, user, or location';
COMMENT ON COLUMN inventory_assignments.assignment_type IS 'Purpose: event_checkout, long_term_staff, warehouse, temporary';
COMMENT ON COLUMN inventory_assignments.status IS 'Current status: assigned, checked_out, in_use, returned, cancelled';
COMMENT ON COLUMN inventory_assignments.prep_status IS 'Preparation status: needs_prep, prepped, checked, packed';

