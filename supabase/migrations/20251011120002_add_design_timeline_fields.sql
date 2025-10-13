-- Add timeline and workflow fields to design_item_types
-- These fields support the Settings UI for configuring design workflows

ALTER TABLE design_item_types
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) CHECK (type IN ('digital', 'physical')) DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS default_design_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS default_production_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_shipping_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_approval_buffer_days INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS urgent_threshold_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS is_auto_added BOOLEAN DEFAULT false;

COMMENT ON COLUMN design_item_types.type IS 'Item type: digital (files only) or physical (requires production/shipping)';
COMMENT ON COLUMN design_item_types.default_design_days IS 'Default number of days allocated for design work';
COMMENT ON COLUMN design_item_types.default_production_days IS 'Default production time (for physical items)';
COMMENT ON COLUMN design_item_types.default_shipping_days IS 'Default shipping time (for physical items)';
COMMENT ON COLUMN design_item_types.client_approval_buffer_days IS 'Buffer days for client review and approval';
COMMENT ON COLUMN design_item_types.urgent_threshold_days IS 'Days before event when item becomes urgent';
COMMENT ON COLUMN design_item_types.is_auto_added IS 'Automatically add this type to every new event';

-- Update existing records to set reasonable defaults based on category
UPDATE design_item_types SET
  type = CASE
    WHEN category IN ('print', 'environmental', 'promotional') THEN 'physical'
    ELSE 'digital'
  END,
  default_production_days = CASE
    WHEN category IN ('print', 'environmental', 'promotional') THEN 3
    ELSE 0
  END,
  default_shipping_days = CASE
    WHEN category IN ('print', 'environmental', 'promotional') THEN 2
    ELSE 0
  END
WHERE type IS NULL;
