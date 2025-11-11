-- Update items B101 through B125 to $50
UPDATE inventory_items
SET item_value = 50.00
WHERE serial_number IN (
  'B101', 'B102', 'B103', 'B104', 'B105', 'B106', 'B107', 'B108', 'B109', 'B110',
  'B111', 'B112', 'B113', 'B114', 'B115', 'B116', 'B117', 'B118', 'B119', 'B120',
  'B121', 'B122', 'B123', 'B124', 'B125'
);
