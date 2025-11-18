-- Add quantity column to product_group_items junction table
-- This allows specifying how many units of a quantity-tracked item belong to a product group
-- For example: "John's Kit" contains 2 of the 5 available backdrop stands

-- Add quantity column (defaults to 1 for existing records)
ALTER TABLE product_group_items
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure quantity is positive
ALTER TABLE product_group_items
ADD CONSTRAINT product_group_items_quantity_check CHECK (quantity > 0);

-- Add comment
COMMENT ON COLUMN product_group_items.quantity IS 'Number of units of this item in the group. For serial-tracked items, this is always 1. For quantity-tracked items, this can be any positive integer up to total_quantity.';

