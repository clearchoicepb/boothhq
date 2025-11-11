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
CREATE INDEX idx_inventory_assignment_history_tenant
  ON inventory_assignment_history(tenant_id);

CREATE INDEX idx_inventory_assignment_history_item
  ON inventory_assignment_history(tenant_id, inventory_item_id, changed_at DESC);

CREATE INDEX idx_inventory_assignment_history_assigned_to
  ON inventory_assignment_history(tenant_id, assigned_to_type, assigned_to_id);

CREATE INDEX idx_inventory_assignment_history_event
  ON inventory_assignment_history(tenant_id, event_id)
  WHERE event_id IS NOT NULL;

-- Add RLS policies
ALTER TABLE inventory_assignment_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for their tenant
CREATE POLICY "Users can view assignment history for their tenant"
  ON inventory_assignment_history
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert history for their tenant (via trigger mostly)
CREATE POLICY "Users can insert assignment history for their tenant"
  ON inventory_assignment_history
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Comment on table
COMMENT ON TABLE inventory_assignment_history IS 'Tracks all assignment changes for inventory items, preserving who had what equipment and when';
