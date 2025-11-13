-- Create inventory notifications system for maintenance reminders and alerts
-- Supports maintenance due/overdue notifications and low stock alerts

CREATE TABLE IF NOT EXISTS inventory_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,

  -- Related entities (polymorphic - either inventory item or consumable)
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  consumable_id UUID REFERENCES consumable_inventory(id) ON DELETE CASCADE,

  -- Notification details
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('maintenance_due', 'maintenance_overdue', 'low_stock', 'out_of_stock')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),

  -- Message content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  due_date DATE,

  -- Tracking
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES users(id),

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_notification_entity CHECK (
    (inventory_item_id IS NOT NULL AND consumable_id IS NULL) OR
    (inventory_item_id IS NULL AND consumable_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_notifications_tenant ON inventory_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_notifications_item ON inventory_notifications(inventory_item_id) WHERE inventory_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_notifications_consumable ON inventory_notifications(consumable_id) WHERE consumable_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_notifications_type ON inventory_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_inventory_notifications_status ON inventory_notifications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_notifications_due_date ON inventory_notifications(due_date) WHERE due_date IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_inventory_notifications_updated_at
  BEFORE UPDATE ON inventory_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON inventory_notifications TO service_role;
GRANT ALL ON inventory_notifications TO authenticated;
GRANT SELECT ON inventory_notifications TO anon;

-- Add comments
COMMENT ON TABLE inventory_notifications IS 'Notifications for maintenance reminders, overdue items, and low stock alerts';
COMMENT ON COLUMN inventory_notifications.notification_type IS 'Type: maintenance_due, maintenance_overdue, low_stock, or out_of_stock';
COMMENT ON COLUMN inventory_notifications.status IS 'Status: pending (not sent), sent (email sent), or dismissed (user acknowledged)';
COMMENT ON COLUMN inventory_notifications.inventory_item_id IS 'Link to inventory item (for maintenance notifications)';
COMMENT ON COLUMN inventory_notifications.consumable_id IS 'Link to consumable (for stock alerts)';
