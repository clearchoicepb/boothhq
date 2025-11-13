-- Add maintenance tracking fields to inventory_items table
-- These fields enable scheduled maintenance tracking and reminders

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
  ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
  ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;

-- Create index for maintenance queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_next_maintenance
  ON inventory_items(tenant_id, next_maintenance_date)
  WHERE next_maintenance_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN inventory_items.last_maintenance_date IS 'Date of last completed maintenance';
COMMENT ON COLUMN inventory_items.next_maintenance_date IS 'Date when next maintenance is due';
COMMENT ON COLUMN inventory_items.maintenance_interval_days IS 'Number of days between maintenance (overrides category default if set)';
COMMENT ON COLUMN inventory_items.maintenance_notes IS 'General maintenance notes and history summary';
