-- ============================================================================
-- ADD MISSING FOREIGN KEYS TO BUSINESS TABLES
-- ============================================================================
-- Based on comprehensive audit of Tenant DB foreign key relationships
-- Run this in your TENANT DB SQL Editor
-- ============================================================================

-- 1. Design Items: Link to event dates
-- This allows PostgREST to resolve event_date relationships
ALTER TABLE event_design_items
ADD CONSTRAINT event_design_items_event_date_id_fkey
FOREIGN KEY (event_date_id)
REFERENCES event_dates(id)
ON DELETE CASCADE;

-- 2. Opportunities: Link to event types
-- This allows filtering/joining opportunities by event type
ALTER TABLE opportunities
ADD CONSTRAINT opportunities_event_type_id_fkey
FOREIGN KEY (event_type_id)
REFERENCES event_types(id)
ON DELETE RESTRICT;  -- RESTRICT to prevent deleting event types that have opportunities

-- 3. Opportunity Line Items: Link to packages (nullable)
-- Uses SET NULL since we nullified invalid references during migration
ALTER TABLE opportunity_line_items
ADD CONSTRAINT opportunity_line_items_package_id_fkey
FOREIGN KEY (package_id)
REFERENCES packages(id)
ON DELETE SET NULL;

-- 4. Opportunity Line Items: Link to add-ons (nullable)
-- Uses SET NULL since we nullified invalid references during migration
ALTER TABLE opportunity_line_items
ADD CONSTRAINT opportunity_line_items_add_on_id_fkey
FOREIGN KEY (add_on_id)
REFERENCES add_ons(id)
ON DELETE SET NULL;

-- 5. Invoices: Link to opportunities
-- This allows querying invoice.opportunity relationship
ALTER TABLE invoices
ADD CONSTRAINT invoices_opportunity_id_fkey
FOREIGN KEY (opportunity_id)
REFERENCES opportunities(id)
ON DELETE RESTRICT;  -- RESTRICT to prevent deleting opportunities that have invoices

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify all foreign keys were added successfully
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name IN (
    'event_design_items_event_date_id_fkey',
    'opportunities_event_type_id_fkey',
    'opportunity_line_items_package_id_fkey',
    'opportunity_line_items_add_on_id_fkey',
    'invoices_opportunity_id_fkey'
  )
ORDER BY tc.table_name, kcu.column_name;

