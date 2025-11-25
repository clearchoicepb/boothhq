-- Grant permissions for Operations System tables
-- Allows service_role, authenticated, and anon roles to access the tables

-- operations_item_types permissions
GRANT ALL ON operations_item_types TO service_role;
GRANT ALL ON operations_item_types TO authenticated;
GRANT ALL ON operations_item_types TO anon;

-- event_operations_items permissions
GRANT ALL ON event_operations_items TO service_role;
GRANT ALL ON event_operations_items TO authenticated;
GRANT ALL ON event_operations_items TO anon;

-- Log that permissions were granted
DO $$
BEGIN
  RAISE NOTICE '[Operations] Permissions granted for operations_item_types and event_operations_items tables';
END $$;
