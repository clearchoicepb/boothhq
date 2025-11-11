-- Create inventory_assignment_history table to track all assignment changes
CREATE TABLE IF NOT EXISTS inventory_assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL,

  -- Assignment details (capturing the state at time of change)
  assigned_from_type TEXT, -- null for initial creation, otherwise 'user', 'physical_address', 'product_group', or 'unassigned'
  assigned_from_id UUID, -- null if unassigned
  assigned_from_name TEXT, -- denormalized for history preservation

  assigned_to_type TEXT, -- 'user', 'physical_address', 'product_group', or 'unassigned'
  assigned_to_id UUID, -- null if unassigned
  assigned_to_name TEXT, -- denormalized for history preservation

  -- Assignment type for tracking purpose
  assignment_type TEXT, -- 'long_term_staff', 'event_checkout', 'warehouse', or null
  event_id UUID, -- optional link to event
  expected_return_date DATE, -- for event checkouts

  -- Metadata
  changed_by UUID, -- who made the change
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT, -- optional notes about why the change was made

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_assignment_history_tenant
  ON inventory_assignment_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_assignment_history_item
  ON inventory_assignment_history(tenant_id, inventory_item_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_assignment_history_assigned_to
  ON inventory_assignment_history(tenant_id, assigned_to_type, assigned_to_id);

CREATE INDEX IF NOT EXISTS idx_inventory_assignment_history_event
  ON inventory_assignment_history(tenant_id, event_id)
  WHERE event_id IS NOT NULL;

-- Grant permissions to all roles
GRANT ALL ON inventory_assignment_history TO service_role;
GRANT ALL ON inventory_assignment_history TO authenticated;
GRANT ALL ON inventory_assignment_history TO anon;

-- Ensure schema permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Comment on table
COMMENT ON TABLE inventory_assignment_history IS 'Tracks all assignment changes for inventory items, preserving who had what equipment and when';
