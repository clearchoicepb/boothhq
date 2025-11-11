-- Add model column to inventory_items table
-- This allows tracking the specific model/variant of equipment (e.g., "T6", "DS620", "10.5 inch")

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS model VARCHAR(255);

-- Add comment
COMMENT ON COLUMN inventory_items.model IS 'Specific model or variant of the equipment (optional)';
