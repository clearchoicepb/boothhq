-- Update inventory item values based on category
UPDATE inventory_items
SET item_value = CASE item_category
  WHEN 'Printers' THEN 950.00
  WHEN 'Cameras' THEN 450.00
  WHEN 'Lighting' THEN 250.00
  WHEN 'iPads' THEN 250.00
  WHEN 'Backdrops' THEN 90.00
  WHEN 'Backdrop Stands' THEN 220.00
  WHEN 'Hotspots' THEN 150.00
  WHEN 'Computer' THEN 200.00
  ELSE item_value -- Keep existing value if category doesn't match
END
WHERE item_category IN ('Printers', 'Cameras', 'Lighting', 'iPads', 'Backdrops', 'Backdrop Stands', 'Hotspots', 'Computer');
