-- ✅ READY TO RUN - Full Inventory Import Script
-- Generated: 2025-11-11T00:23:10.889Z
-- Source: Inventory Sheet - Inventory.csv
--
-- Configuration:
--   Tenant ID: 5f98f4c0-5254-4c61-8633-55ea049c7f18
--   Warehouse: Westlake OH Warehouse (1bf13de1-6148-4919-8978-dd9f7252f298)
--   Items to import: 161
--
-- What this script does:
--   - Imports all 161 inventory items from the CSV file
--   - Maps categories (360 Podium → Custom Experience, Battery Pack → Misc Item, etc.)
--   - Sets tracking type based on serial numbers (serial_number vs total_quantity)
--   - Assigns all items to Westlake OH Warehouse
--   - Preserves notes from the CSV
--
-- INSTRUCTIONS:
--   1. Copy this entire script
--   2. Open Supabase SQL Editor
--   3. Paste and run
--   4. Check the verification queries at the end to confirm success

BEGIN;

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
('5f98f4c0-5254-4c61-8633-55ea049c7f18', '3P102', 'Custom Experience', 'Small', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', '3P101', 'Custom Experience', 'Large', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', '3P103', 'Custom Experience', 'Small', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BW6', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'GS2', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'GRS1', 'Backdrop', 'Green Screen (PU)', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'GS3', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BW101', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'PS2', 'Backdrop', 'Hot Pink Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'RS1', 'Backdrop', 'Red Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS1', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS2', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS3', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS4', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS5', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BGS1', 'Backdrop', 'Blue/ Green Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'PS1', 'Backdrop', 'Light Pink Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BS1', 'Backdrop', 'Blue Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BS2', 'Backdrop', 'Steel Blue Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'GS4', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'GS5', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS6', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BS3', 'Backdrop', 'Navy Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BW1', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BW2', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BW3', 'Backdrop', 'Black/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'GS1', 'Backdrop', 'Gold Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B101', 'Misc Item', 'Small Battery', 'serial_number', 'HX120S2', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B112', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B109', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B113', 'Misc Item', 'Small Battery', 'serial_number', 'HX120S2', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD108', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B103', 'Misc Item', 'Small Battery', 'serial_number', 'K-MP806', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B114', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B111', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B110', 'Misc Item', '360 Battery', 'serial_number', 'BP-95', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B116', 'Misc Item', '360 Battery', 'serial_number', 'BP-95', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B106', 'Misc Item', 'Large Battery', 'serial_number', 'A1268', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B108', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B107', 'Misc Item', '360 Battery', 'serial_number', 'BP-150WS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B105', 'Misc Item', 'Large Battery', 'serial_number', 'A1268', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'WW1', 'Backdrop', 'White Wood/ White', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD101', 'Backdrop Stand', '8x10', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'MISSING 1 POLE FROM BRIDGETTE'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD106 - FRAME NEEDS MARKED', 'Backdrop Stand', '7x7', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'SEQUINS ONLY'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD104', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD107', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD109', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B102', 'Misc Item', 'Small Battery', 'serial_number', 'SA-130', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B104', 'Misc Item', 'Large Battery', 'serial_number', 'A1268', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B125', 'Misc Item', 'Small Battery', 'serial_number', '621 Magnetic', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B122', 'Misc Item', 'Large Battery', 'serial_number', '24SEW37-SU00094', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B124', 'Misc Item', 'Small Battery', 'serial_number', 'HX120S2', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C101', 'Camera', 'T6', 'serial_number', '332073051549', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C105', 'Camera', 'R100', 'serial_number', '102070001458', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C111', 'Camera', 'T6', 'serial_number', '212073095406', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C106', 'Camera', 'T6', 'serial_number', '232073083116', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C107', 'Camera', 'T6', 'serial_number', '432074050278', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C104', 'Camera', 'T7', 'serial_number', '412075050389', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C107', 'Camera', 'T7', 'serial_number', '412075050392', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Cracked sreen; fully functional'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B118', 'Misc Item', 'Large Battery', 'serial_number', 'Anker 335', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B119', 'Misc Item', 'Large Battery', 'serial_number', 'Anker 335', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B120', 'Misc Item', 'Large Battery', 'serial_number', 'RP-BP41', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B121', 'Misc Item', 'Large Battery', 'serial_number', '24SEW37-SU00094', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B123', 'Misc Item', 'Large Battery', 'serial_number', '24SEW37-SU00094', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C109', 'Camera', 'T6', 'serial_number', '2073012224', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'HOT SPOTS, ONLY USE IF WE ARE FUCKED'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C103', 'Camera', 'T6', 'serial_number', '202073098568', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C108', 'Camera', 'T7', 'serial_number', '412075050391', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C113', 'Camera', 'T7', 'serial_number', '412075050332', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C115', 'Camera', 'T7', 'serial_number', '412075050394', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C116', 'Camera', 'T7', 'serial_number', '412075050390', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C112', 'Camera', 'R100', 'serial_number', '182031000470', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C117', 'Camera', 'R8', 'serial_number', '272022006099', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C118', 'Camera', 'T6', 'serial_number', '342073011593', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C122', 'Camera', 'T6', 'serial_number', '4402074039239', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'giving ella problems, needs tested before it goes back out'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS103', 'Misc Item', 'Mifi', 'serial_number', 'MiFi', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'not connect to Inseego Ap'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS106', 'Misc Item', 'Mifi', 'serial_number', '990018891815239', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS107', 'Misc Item', 'Mifi', 'serial_number', '990018891773834', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 264.6 down, 6.8 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS104', 'Misc Item', 'Mifi', 'serial_number', '990018891815205', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F103', 'Lighting', 'DB800', 'serial_number', 'DB08006376', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Gave Ella problems, needs tested before it goes back out'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS108', 'Misc Item', 'Mifi', 'serial_number', '990018891773776', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 241.2 down, 3.8 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS105', 'Misc Item', 'Mifi', 'serial_number', '990018891806840', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F104', 'Lighting', 'DB400', 'serial_number', 'REPL100293', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F105', 'Lighting', 'DB800', 'serial_number', 'DB08011935', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F108', 'Lighting', 'DB800', 'serial_number', 'DB08011933', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F109', 'Lighting', 'DB400', 'serial_number', 'DB04010939', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F110', 'Lighting', 'DB800', 'serial_number', 'DB08011720', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F111', 'Lighting', 'MS300', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F112', 'Lighting', 'MS300', 'serial_number', 'unknown', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F113', 'Lighting', 'MS300', 'serial_number', 'unknown', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS101', 'Misc Item', 'Mifi', 'serial_number', 'MiFi', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'not connect to Inseego Ap'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS102', 'Misc Item', 'Mifi', 'serial_number', 'MiFi', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6-9-25: 180.1 down, 4.31 up (not connect to Inseego Ap)'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS114', 'Misc Item', 'Mifi', 'serial_number', '990018891761292', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 288.3 down, 0.51 up (from Anthony''s house)'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS111', 'Misc Item', 'Mifi', 'serial_number', '990018891774113', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 214.0 down, 10.0 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS110', 'Misc Item', 'Mifi', 'serial_number', '990018891773727', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 240.4 down, 5.7 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS112', 'Misc Item', 'Mifi', 'serial_number', '990018891730313', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 230.5 down, 4.9 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS113', 'Misc Item', 'Mifi', 'serial_number', '990018891761250', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 348.8 down, 6.3 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS115', 'Misc Item', 'Mifi', 'serial_number', '990018891726998', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 206.9 down, 4.4 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD105', 'iPad', '10.5', 'serial_number', 'CFW63K37WK', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '440-902-0977'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD102', 'iPad', '10.5', 'serial_number', 'JL3JDYPH0', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '440-902-0984'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS116', 'Misc Item', 'Mifi', 'serial_number', '990018891730271', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 254.3 down, 7.4 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD103', 'iPad', '10.5', 'serial_number', 'LQYFLX9K60', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '440-902-0987'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD107', 'iPad', '10.5', 'serial_number', 'GWWW4KQDWY', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '440-902-1179'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD101', 'iPad', '10.5', 'serial_number', 'KN4HN9K0X0', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'HS109', 'Misc Item', 'Mifi', 'serial_number', '990018891720652', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '6/9/25: 271.6 down, 2.4 up'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD109', 'iPad', '10.5', 'serial_number', 'HC7GDH20TQ', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S106', 'Computer', 'HP', 'serial_number', 'SCG1374R4L', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Alejandro came in on 5-19-25 to have printer/ server tested, everything tested fine and is in good working ocndition'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD118', 'iPad', '10.5', 'serial_number', 'DQ0P9YGWR1', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '440-453-6309'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD119', 'iPad', '10.5', 'serial_number', 'HVKL7NPWC0', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'logged into Hipstr Apple ID'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD122', 'iPad', '10.5', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD124', 'iPad', '10.5', 'serial_number', 'DMQDCABBMF3Q', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD120', 'iPad', '10.5', 'serial_number', 'X2QQKKF61F', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'NO SERVICE'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'PH101', 'Misc Item', '16 Pro', 'serial_number', 'F2PY92F6Q0', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'phone number - 440-360-0677'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P101', 'Printer', 'DS620', 'serial_number', 'DS6X57006781', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Alejandro came in on 5-19-25 to have printer/ server tested, everything tested fine and is in good working ocndition'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD123', 'iPad', '10.5', 'serial_number', 'DMQDCAMLMF3Q', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P103', 'Printer', 'DS620', 'serial_number', 'DS6X68014601', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD121', 'iPad', '10.5', 'serial_number', 'DMQDCE6MMF3Q', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P104', 'Printer', 'DS620', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P107', 'Printer', 'DS620', 'serial_number', 'DS6C91022225', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '90 DAY WARRANTY ON REPAIR'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P110', 'Printer', 'Mosaic', 'serial_number', 'U24F020792', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S107', 'Computer', 'Surface Pro', 'serial_number', '016545792553', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Might''ve fried at Veda''s event; needs checked before it goes out'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P114', 'Printer', 'DS40', 'serial_number', 'DS4Y37045987', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P112', 'Printer', 'DS40', 'serial_number', 'DS4Y3B055152', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S108', 'Computer', 'Surface Pro', 'serial_number', '013329392653', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P117', 'Printer', 'DS80', 'serial_number', 'DS8X04005810', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'RL101', 'Lighting', 'U200 (Square)', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S103', 'Computer', 'Acer', 'serial_number', 'NXHG5AA0019191D7A37600', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P111', 'Printer', 'Mosaic', 'serial_number', 'U24F021538', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Has issues, works sometimes'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P116', 'Printer', 'DS40', 'serial_number', 'DS4X03014150', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'RL102', 'Lighting', 'LG-R320C (Round)', 'serial_number', '00240351523501499', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'RL103', 'Lighting', 'U200 (Square)', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S101 - Array', 'Computer', 'Lenovo', 'serial_number', 'R912BA9Y', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S102', 'Computer', 'Acer', 'serial_number', 'W0I111700V502D2A6C7206', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Fried?'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S104', 'Computer', 'Lenovo', 'serial_number', 'YD04FYB6', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P119', 'Printer', 'QW410', 'serial_number', 'QW4C08006449', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C110', 'Camera', 'T6', 'serial_number', '332073032583', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'C102', 'Camera', 'R100', 'serial_number', '162031006479', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'B117', 'Misc Item', '360 Battery', 'serial_number', 'BP-95', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD110', 'iPad', '10.5', 'serial_number', 'J60TJN62VW', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'won''t connect to Orca'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD112', 'iPad', '10.5', 'serial_number', 'Q5PHPWNWTN', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'WON''T CONNECT'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD113', 'iPad', '10.5', 'serial_number', 'DF6CVF2X17', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', '440-453-5294'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'IPAD115', 'iPad', '10.5', 'serial_number', 'JJG92WRHYH', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'won''t hard-wire to printer, but cell service works'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F101', 'Lighting', 'DB400', 'serial_number', 'DB04008413', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'F102', 'Lighting', 'DB400', 'serial_number', 'DB04010938', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'Recently fixed'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'P106', 'Printer', 'DS620', 'serial_number', 'DS6X6A018167', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S109', 'Computer', 'ASUS', 'serial_number', 'S6N0CX005197226', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S110 - Mosaic', 'Computer', 'Lenovo', 'serial_number', 'MP1G451B', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S111', 'Computer', 'Mini PC', 'serial_number', 'P0250515005MA-300159', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'WS1', 'Backdrop', 'White Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD103', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'NO FABRIC IN CASE'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'OS1', 'Backdrop', 'Onyx Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'WS2', 'Backdrop', 'Opal Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD105', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'BD102', 'Backdrop Stand', '8x8', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', 'NO FABRIC IN CASE'),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S112', 'Computer', 'Mini PC', 'serial_number', 'PO250415002MJMXG0396', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S113', 'Computer', 'Mini PC', 'serial_number', 'PO0250415002MJMXG0335', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S114', 'Computer', 'Mini PC', 'serial_number', 'PO250415002MJMXG0323', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S115', 'Computer', 'Mini PC', 'serial_number', 'PO250415002MJMXG0286', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'SS7', 'Backdrop', 'Silver Sequin', 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S116', 'Computer', 'Mini PC', 'serial_number', 'P0250712003MEMSQ0061', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'S118', 'Computer', 'Lenovo', 'serial_number', 'R912CGDS', NULL, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL),
('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'License x6', 'Misc Item', NULL, 'total_quantity', NULL, 1, '2024-01-01', 0.00, 'physical_address', '1bf13de1-6148-4919-8978-dd9f7252f298', NULL);

COMMIT;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- 1. Check total items imported
SELECT COUNT(*) as total_items_imported
FROM inventory_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
-- Expected: 161 items

-- 2. Check breakdown by category
SELECT
  item_category,
  COUNT(*) as count
FROM inventory_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
GROUP BY item_category
ORDER BY count DESC;

-- 3. Check tracking type distribution
SELECT
  tracking_type,
  COUNT(*) as count
FROM inventory_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
GROUP BY tracking_type;

-- 4. Check assignment to warehouse
SELECT
  COUNT(*) as items_assigned_to_warehouse
FROM inventory_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
  AND assigned_to_type = 'physical_address'
  AND assigned_to_id = '1bf13de1-6148-4919-8978-dd9f7252f298';
-- Expected: 161 items

-- 5. Check items with notes
SELECT
  COUNT(*) as items_with_notes
FROM inventory_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
  AND item_notes IS NOT NULL;

-- 6. Sample of imported items
SELECT
  item_name,
  item_category,
  model,
  tracking_type,
  serial_number,
  item_notes
FROM inventory_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
ORDER BY item_name
LIMIT 10;
