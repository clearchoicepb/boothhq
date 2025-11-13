-- Create maintenance_history table for tracking all maintenance activities
-- Provides audit trail and history for each inventory item

CREATE TABLE IF NOT EXISTS maintenance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  -- Maintenance details
  maintenance_date DATE NOT NULL,
  performed_by UUID REFERENCES users(id),
  maintenance_type VARCHAR(50) DEFAULT 'scheduled' CHECK (maintenance_type IN ('scheduled', 'repair', 'inspection', 'cleaning', 'calibration', 'other')),

  -- Documentation
  notes TEXT NOT NULL,
  cost DECIMAL(10, 2),

  -- Next maintenance scheduling
  next_maintenance_date DATE,

  -- Link to auto-generated task (if applicable)
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_history_tenant ON maintenance_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_item ON maintenance_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_performed_by ON maintenance_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_date ON maintenance_history(tenant_id, maintenance_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_task ON maintenance_history(task_id) WHERE task_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_history_updated_at
  BEFORE UPDATE ON maintenance_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update inventory_items when maintenance is completed
CREATE OR REPLACE FUNCTION update_inventory_maintenance_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the inventory item's maintenance dates
  UPDATE inventory_items
  SET
    last_maintenance_date = NEW.maintenance_date,
    next_maintenance_date = NEW.next_maintenance_date,
    updated_at = NOW()
  WHERE id = NEW.inventory_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_maintenance_dates
  AFTER INSERT ON maintenance_history
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_maintenance_dates();

-- Grant permissions
GRANT ALL ON maintenance_history TO service_role;
GRANT ALL ON maintenance_history TO authenticated;
GRANT SELECT ON maintenance_history TO anon;

-- Add comments
COMMENT ON TABLE maintenance_history IS 'Complete history of all maintenance activities performed on inventory items';
COMMENT ON COLUMN maintenance_history.maintenance_type IS 'Type of maintenance: scheduled, repair, inspection, cleaning, calibration, or other';
COMMENT ON COLUMN maintenance_history.task_id IS 'Link to the task that was created for this maintenance (if auto-generated)';
COMMENT ON COLUMN maintenance_history.next_maintenance_date IS 'Calculated next maintenance date set when this maintenance was completed';
