-- Run this on APPLICATION DB to see all tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Save output, then run same query on TENANT DB and compare

-- Expected TENANT DB tables (should have ALL of these):
-- accounts, contacts, contact_accounts, leads, opportunities, opportunity_line_items
-- events, event_dates, event_staff, event_categories, event_types
-- invoices, invoice_line_items, quotes, quote_line_items, payments
-- locations, tasks, notes, attachments, communications, contracts
-- tenant_settings (CRITICAL!), templates, packages, add_ons, staff_roles
-- booths, booth_types, booth_assignments
-- equipment, equipment_types, equipment_items, equipment_categories
-- design_types, design_statuses
-- core_task_templates, core_tasks

-- Expected APPLICATION DB ONLY tables:
-- tenants, users (global), roles, permissions, audit_log
