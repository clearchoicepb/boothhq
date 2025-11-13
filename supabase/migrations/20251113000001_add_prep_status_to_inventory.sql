-- Add equipment prep status tracking fields to inventory_items table
-- This enables the Equipment Manager to track the full lifecycle of event equipment

-- Create enum for prep status
CREATE TYPE prep_status_enum AS ENUM (
  'unassigned',          -- No event assignment yet
  'needs_prep',          -- Assigned to event but not prepped
  'ready_for_pickup',    -- Prepped and ready for staff pickup
  'in_transit',          -- Shipped to staff
  'delivered_to_staff',  -- Staff has received equipment
  'pending_checkin',     -- Returned but not checked in yet
  'checked_in'           -- Checked in and back to warehouse
);

-- Create enum for check-in condition
CREATE TYPE checkin_condition_enum AS ENUM (
  'good',      -- Equipment in good condition
  'damaged',   -- Equipment damaged
  'missing'    -- Equipment missing/lost
);

-- Add prep status tracking fields
ALTER TABLE inventory_items
  -- Core prep status
  ADD COLUMN prep_status prep_status_enum DEFAULT 'unassigned',

  -- Prep completion tracking
  ADD COLUMN prep_completed_at TIMESTAMPTZ,
  ADD COLUMN prep_completed_by UUID REFERENCES users(id),

  -- Shipping tracking
  ADD COLUMN shipped_at TIMESTAMPTZ,
  ADD COLUMN shipped_by UUID REFERENCES users(id),
  ADD COLUMN shipping_carrier TEXT,
  ADD COLUMN shipping_tracking_number TEXT,
  ADD COLUMN shipping_expected_delivery DATE,

  -- Delivery tracking
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN delivered_by UUID REFERENCES users(id),

  -- Check-in tracking
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_in_by UUID REFERENCES users(id),
  ADD COLUMN checkin_condition checkin_condition_enum,
  ADD COLUMN checkin_notes TEXT;

-- Add indexes for frequently queried fields
CREATE INDEX idx_inventory_items_prep_status ON inventory_items(prep_status) WHERE prep_status IS NOT NULL;
CREATE INDEX idx_inventory_items_prep_completed_at ON inventory_items(prep_completed_at) WHERE prep_completed_at IS NOT NULL;
CREATE INDEX idx_inventory_items_shipped_at ON inventory_items(shipped_at) WHERE shipped_at IS NOT NULL;
CREATE INDEX idx_inventory_items_delivered_at ON inventory_items(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_inventory_items_checked_in_at ON inventory_items(checked_in_at) WHERE checked_in_at IS NOT NULL;

-- Add comment explaining the prep status workflow
COMMENT ON COLUMN inventory_items.prep_status IS 'Equipment prep status for event workflow: unassigned -> needs_prep -> ready_for_pickup/in_transit -> delivered_to_staff -> pending_checkin -> checked_in';

-- Create function to auto-update prep_status when equipment is assigned to event
CREATE OR REPLACE FUNCTION set_initial_prep_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When equipment is assigned to an event, set prep_status to needs_prep
  IF NEW.event_id IS NOT NULL AND (OLD.event_id IS NULL OR OLD.event_id IS DISTINCT FROM NEW.event_id) THEN
    NEW.prep_status := 'needs_prep';
  END IF;

  -- When equipment is unassigned from event, reset prep status
  IF NEW.event_id IS NULL AND OLD.event_id IS NOT NULL THEN
    NEW.prep_status := 'unassigned';
    NEW.prep_completed_at := NULL;
    NEW.prep_completed_by := NULL;
    NEW.shipped_at := NULL;
    NEW.shipped_by := NULL;
    NEW.shipping_carrier := NULL;
    NEW.shipping_tracking_number := NULL;
    NEW.shipping_expected_delivery := NULL;
    NEW.delivered_at := NULL;
    NEW.delivered_by := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set prep status on event assignment
DROP TRIGGER IF EXISTS trigger_set_initial_prep_status ON inventory_items;
CREATE TRIGGER trigger_set_initial_prep_status
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_prep_status();

-- Backfill existing event assignments with needs_prep status
UPDATE inventory_items
SET prep_status = 'needs_prep'
WHERE event_id IS NOT NULL
  AND assignment_type = 'event_checkout'
  AND prep_status = 'unassigned';
