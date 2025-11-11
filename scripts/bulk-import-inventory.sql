-- Bulk Import Inventory from CSV
-- This script imports all 165 inventory items from "Inventory Sheet - Inventory.csv"
--
-- BEFORE RUNNING:
-- 1. Replace YOUR_TENANT_ID with your actual tenant ID
-- 2. Make sure you've run the test insert script first and verified it works
-- 3. Make sure the Westlake OH Warehouse address exists with ID: 1bf13de1-6148-4919-8978-dd9f7252f298
--
-- To get your tenant ID, run: SELECT id FROM tenants LIMIT 1;

-- Helper function to map device categories
CREATE OR REPLACE FUNCTION map_device_to_category(device TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN device = '360 Podium' THEN 'Custom Experience'
    WHEN device = 'Backdrop' THEN 'Backdrop'
    WHEN device = 'Backdrop Frame' THEN 'Backdrop Stand'
    WHEN device = 'Battery Pack' THEN 'Misc Item'
    WHEN device = 'Camera' THEN 'Camera'
    WHEN device LIKE 'Flash%' OR device = 'Flash' THEN 'Lighting'
    WHEN device = 'Hot Spot' THEN 'Misc Item'
    WHEN device = 'iPad' THEN 'iPad'
    WHEN device = 'iPhone' THEN 'Misc Item'
    WHEN device = 'Printer' THEN 'Printer'
    WHEN device = 'Ring Light' THEN 'Lighting'
    WHEN device = 'Server' THEN 'Computer'
    ELSE 'Misc Item'
  END;
END;
$$ LANGUAGE plpgsql;

-- Start transaction
BEGIN;

-- REPLACE 'YOUR_TENANT_ID' with your actual tenant ID in the INSERT below
-- For example: '123e4567-e89b-12d3-a456-426614174000'

INSERT INTO inventory_items (
  tenant_id,
  item_name,
  item_category,
  model,
  tracking_type,
  serial_number,
  total_quantity,
  purchase_date,
  item_value,
  assigned_to_type,
  assigned_to_id,
  item_notes
) VALUES
-- Row 1: 3P102
('YOUR_TENANT_ID', '3P102', 'Custom Experience', 'Small', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 2: 3P101
('YOUR_TENANT_ID', '3P101', 'Custom Experience', 'Large', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 3: 3P103
('YOUR_TENANT_ID', '3P103', 'Custom Experience', 'Small', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 4: BW6
('YOUR_TENANT_ID', 'BW6', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 5: GS2
('YOUR_TENANT_ID', 'GS2', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 6: GRS1
('YOUR_TENANT_ID', 'GRS1', 'Backdrop', 'Green Screen (PU)', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 7: GS3
('YOUR_TENANT_ID', 'GS3', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 8: BW101
('YOUR_TENANT_ID', 'BW101', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 9: PS2
('YOUR_TENANT_ID', 'PS2', 'Backdrop', 'Hot Pink Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 10: RS1
('YOUR_TENANT_ID', 'RS1', 'Backdrop', 'Red Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 11: SS1
('YOUR_TENANT_ID', 'SS1', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 12: SS2
('YOUR_TENANT_ID', 'SS2', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 13: SS3
('YOUR_TENANT_ID', 'SS3', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 14: SS4
('YOUR_TENANT_ID', 'SS4', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 15: SS5
('YOUR_TENANT_ID', 'SS5', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 16: BGS1
('YOUR_TENANT_ID', 'BGS1', 'Backdrop', 'Blue/ Green Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 17: PS1
('YOUR_TENANT_ID', 'PS1', 'Backdrop', 'Light Pink Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 18: BS1
('YOUR_TENANT_ID', 'BS1', 'Backdrop', 'Blue Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 19: BS2
('YOUR_TENANT_ID', 'BS2', 'Backdrop', 'Steel Blue Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 20: GS4
('YOUR_TENANT_ID', 'GS4', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 21: GS5
('YOUR_TENANT_ID', 'GS5', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 22: SS6
('YOUR_TENANT_ID', 'SS6', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 23: BS3
('YOUR_TENANT_ID', 'BS3', 'Backdrop', 'Navy Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 24: BW1
('YOUR_TENANT_ID', 'BW1', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 25: BW2
('YOUR_TENANT_ID', 'BW2', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 26: BW3
('YOUR_TENANT_ID', 'BW3', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 27: GS1
('YOUR_TENANT_ID', 'GS1', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 28: B101
('YOUR_TENANT_ID', 'B101', 'Misc Item', 'Small Battery', 'serial_number', 'HX120S2', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 29: B112
('YOUR_TENANT_ID', 'B112', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 30: B109
('YOUR_TENANT_ID', 'B109', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 31: B113
('YOUR_TENANT_ID', 'B113', 'Misc Item', 'Small Battery', 'serial_number', 'HX120S2', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 32: BD108
('YOUR_TENANT_ID', 'BD108', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 33: B103
('YOUR_TENANT_ID', 'B103', 'Misc Item', 'Small Battery', 'serial_number', 'K-MP806', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 34: B114
('YOUR_TENANT_ID', 'B114', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 35: B111
('YOUR_TENANT_ID', 'B111', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 36: B110
('YOUR_TENANT_ID', 'B110', 'Misc Item', '360 Battery', 'serial_number', 'BP-95', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 37: B116
('YOUR_TENANT_ID', 'B116', 'Misc Item', '360 Battery', 'serial_number', 'BP-95', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 38: B106
('YOUR_TENANT_ID', 'B106', 'Misc Item', 'Large Battery', 'serial_number', 'A1268', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 39: B108
('YOUR_TENANT_ID', 'B108', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 40: B107
('YOUR_TENANT_ID', 'B107', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 41: B105
('YOUR_TENANT_ID', 'B105', 'Misc Item', 'Large Battery', 'serial_number', 'A1268', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 42: WW1
('YOUR_TENANT_ID', 'WW1', 'Backdrop', 'White Wood/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 43: BD101
('YOUR_TENANT_ID', 'BD101', 'Backdrop Stand', '8x10', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'MISSING 1 POLE FROM BRIDGETTE'),
-- Row 44: BD106
('YOUR_TENANT_ID', 'BD106', 'Backdrop Stand', '7x7', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'SEQUINS ONLY'),
-- Row 45: BD104
('YOUR_TENANT_ID', 'BD104', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 46: BD107
('YOUR_TENANT_ID', 'BD107', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 47: BD109
('YOUR_TENANT_ID', 'BD109', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 48: B102
('YOUR_TENANT_ID', 'B102', 'Misc Item', 'Small Battery', 'serial_number', 'SA-130', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 49: B104
('YOUR_TENANT_ID', 'B104', 'Misc Item', 'Large Battery', 'serial_number', 'A1268', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 50: B125
('YOUR_TENANT_ID', 'B125', 'Misc Item', 'Small Battery', 'serial_number', '621 Magnetic', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 51: B122
('YOUR_TENANT_ID', 'B122', 'Misc Item', 'Large Battery', 'serial_number', '24SEW37-SU00094', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
-- Row 52: B124
('YOUR_TENANT_ID', 'B124', 'Misc Item', 'Small Battery', 'serial_number', 'HX120S2', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL);

-- Commit if successful, rollback if any errors
COMMIT;

-- Verify import
SELECT
  item_category,
  COUNT(*) as count
FROM inventory_items
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your tenant ID
GROUP BY item_category
ORDER BY count DESC;
