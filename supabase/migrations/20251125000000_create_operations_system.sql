-- Operations System for Events Module
-- Mirrors the Design System structure for Operations department
-- Enables tracking of operations items, assignments, and timelines

-- ============================================================================
-- TABLE: operations_item_types
-- Purpose: Define operations templates and item types per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS operations_item_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('equipment', 'staffing', 'logistics', 'venue', 'setup', 'other')),

  -- Timeline fields (days before event)
  due_date_days INTEGER DEFAULT 7,
  urgent_threshold_days INTEGER DEFAULT 3,
  missed_deadline_days INTEGER DEFAULT 1,

  -- Configuration
  is_auto_added BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_ops_type_per_tenant UNIQUE(tenant_id, name),
  CONSTRAINT check_ops_date_order CHECK (
    due_date_days > urgent_threshold_days
    AND urgent_threshold_days > missed_deadline_days
    AND missed_deadline_days >= 0
  )
);

COMMENT ON TABLE operations_item_types IS 'Operations item templates and types configured per tenant';
COMMENT ON COLUMN operations_item_types.category IS 'Broad category: equipment, staffing, logistics, venue, setup, other';
COMMENT ON COLUMN operations_item_types.due_date_days IS 'Days before event when task must be completed';
COMMENT ON COLUMN operations_item_types.urgent_threshold_days IS 'Days before event when missed due date becomes urgent';
COMMENT ON COLUMN operations_item_types.missed_deadline_days IS 'Days before event when it is too late';
COMMENT ON COLUMN operations_item_types.is_auto_added IS 'Whether this type is automatically added to every new event';

-- ============================================================================
-- TABLE: event_operations_items
-- Purpose: Track individual operations items for events
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_operations_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  operations_item_type_id UUID NOT NULL REFERENCES operations_item_types(id) ON DELETE RESTRICT,

  -- Item details
  item_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Workflow status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
  )),

  -- Assignment
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timeline tracking
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,

  -- Notes
  internal_notes TEXT,

  -- Workflow automation tracking
  auto_created BOOLEAN DEFAULT false,
  workflow_id UUID,
  workflow_execution_id UUID,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE event_operations_items IS 'Individual operations items tracked per event';
COMMENT ON COLUMN event_operations_items.status IS 'Workflow status of the operations item';
COMMENT ON COLUMN event_operations_items.auto_created IS 'Whether this was created by workflow automation';

-- ============================================================================
-- INDEXES
-- Purpose: Optimize query performance
-- ============================================================================

-- Operations Item Types indexes
CREATE INDEX IF NOT EXISTS idx_operations_item_types_tenant ON operations_item_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operations_item_types_active ON operations_item_types(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_operations_item_types_category ON operations_item_types(category);

-- Event Operations Items indexes
CREATE INDEX IF NOT EXISTS idx_event_operations_items_tenant ON event_operations_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_operations_items_event ON event_operations_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_operations_items_type ON event_operations_items(operations_item_type_id);
CREATE INDEX IF NOT EXISTS idx_event_operations_items_status ON event_operations_items(status);
CREATE INDEX IF NOT EXISTS idx_event_operations_items_assigned ON event_operations_items(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_event_operations_items_due_date ON event_operations_items(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_event_operations_items_event_status ON event_operations_items(event_id, status);

-- ============================================================================
-- TRIGGERS
-- Purpose: Automatically update timestamps
-- ============================================================================

DROP TRIGGER IF EXISTS update_operations_item_types_updated_at ON operations_item_types;
CREATE TRIGGER update_operations_item_types_updated_at
  BEFORE UPDATE ON operations_item_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_operations_items_updated_at ON event_operations_items;
CREATE TRIGGER update_event_operations_items_updated_at
  BEFORE UPDATE ON event_operations_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- Purpose: Secure multi-tenant access
-- ============================================================================

ALTER TABLE operations_item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_operations_items ENABLE ROW LEVEL SECURITY;

-- Operations Item Types policies
DROP POLICY IF EXISTS operations_item_types_tenant_isolation ON operations_item_types;
CREATE POLICY operations_item_types_tenant_isolation ON operations_item_types
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Event Operations Items policies
DROP POLICY IF EXISTS event_operations_items_tenant_isolation ON event_operations_items;
CREATE POLICY event_operations_items_tenant_isolation ON event_operations_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ============================================================================
-- FUNCTION: Create default operations types for a tenant
-- Purpose: Bootstrap new tenants with standard operations types
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_operations_types(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO operations_item_types (tenant_id, name, description, category, due_date_days, urgent_threshold_days, missed_deadline_days, is_auto_added, display_order)
  VALUES
    -- Equipment category
    (p_tenant_id, 'Equipment Check', 'Verify all equipment is ready and functional', 'equipment', 3, 2, 1, true, 1),
    (p_tenant_id, 'Equipment Transport', 'Arrange equipment transport to venue', 'logistics', 2, 1, 0, false, 2),

    -- Staffing category
    (p_tenant_id, 'Staff Assignment', 'Assign staff members to event', 'staffing', 14, 7, 3, true, 3),
    (p_tenant_id, 'Staff Notification', 'Send event details to assigned staff', 'staffing', 3, 2, 1, true, 4),
    (p_tenant_id, 'Staff Briefing', 'Conduct pre-event briefing with staff', 'staffing', 1, 0, 0, false, 5),

    -- Logistics category
    (p_tenant_id, 'Logistics Planning', 'Plan event logistics and timeline', 'logistics', 14, 7, 3, true, 6),
    (p_tenant_id, 'Vendor Coordination', 'Coordinate with external vendors', 'logistics', 7, 3, 1, false, 7),

    -- Venue category
    (p_tenant_id, 'Venue Confirmation', 'Confirm venue details and access', 'venue', 7, 3, 1, true, 8),
    (p_tenant_id, 'Load-In Planning', 'Plan load-in time and logistics', 'venue', 3, 2, 1, false, 9),

    -- Setup category
    (p_tenant_id, 'Booth Setup', 'Set up booth and equipment on-site', 'setup', 0, 0, 0, true, 10),
    (p_tenant_id, 'Software Configuration', 'Configure event software and settings', 'setup', 2, 1, 0, false, 11),
    (p_tenant_id, 'Final Walkthrough', 'Complete final setup walkthrough', 'setup', 0, 0, 0, false, 12)
  ON CONFLICT (tenant_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_operations_types IS 'Creates standard operations types for a new tenant';

-- ============================================================================
-- FUNCTION: Calculate operations deadline
-- Purpose: Calculate deadline based on event date and due_date_days
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_operations_deadline(
  p_event_date DATE,
  p_due_date_days INTEGER
)
RETURNS DATE AS $$
BEGIN
  RETURN p_event_date - p_due_date_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_operations_deadline IS 'Calculate operations deadline based on event date and due date days';

-- ============================================================================
-- SEED: Create default operations types for existing tenants
-- Purpose: Bootstrap existing tenants with default types
-- ============================================================================

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    PERFORM create_default_operations_types(tenant_record.id);
  END LOOP;

  RAISE NOTICE 'Default operations types created for all existing tenants';
END $$;
