-- Add "Misc Item" category for uncategorized equipment
-- This will be used for Battery Packs, Hotspots, iPhones, and other items that don't fit existing categories

INSERT INTO item_categories (category_name, sort_order) VALUES
  ('Misc Item', 99)
ON CONFLICT (category_name) DO NOTHING;
