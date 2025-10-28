-- ============================================================================
-- DATA MIGRATION SCRIPT - STEP 4B: MIGRATE DATA
-- ============================================================================
-- Purpose: Copy data from APPLICATION database to TENANT DATA database
--
-- INSTRUCTIONS:
-- 1. Run PART 1 in APPLICATION DATABASE to generate INSERT statements
-- 2. Copy the generated INSERT statements
-- 3. Run those INSERT statements in TENANT DATA DATABASE
-- ============================================================================

-- ============================================================================
-- PART 1: GENERATE INSERT STATEMENTS (Run in APPLICATION DATABASE)
-- ============================================================================
-- This will create INSERT statements you can copy and paste

-- Generate INSERT for accounts
SELECT
  'INSERT INTO accounts (id, tenant_id, name, account_type, industry, website, business_url, photo_url, billing_address, shipping_address, phone, email, tax_id, payment_terms, credit_limit, status, assigned_to, annual_revenue, employee_count, notes, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    quote_literal(name) || ', ' ||
    COALESCE(quote_literal(account_type), 'NULL') || ', ' ||
    COALESCE(quote_literal(industry), 'NULL') || ', ' ||
    COALESCE(quote_literal(website), 'NULL') || ', ' ||
    COALESCE(quote_literal(business_url), 'NULL') || ', ' ||
    COALESCE(quote_literal(photo_url), 'NULL') || ', ' ||
    COALESCE(quote_literal(billing_address::text), 'NULL') || '::jsonb, ' ||
    COALESCE(quote_literal(shipping_address::text), 'NULL') || '::jsonb, ' ||
    COALESCE(quote_literal(phone), 'NULL') || ', ' ||
    COALESCE(quote_literal(email), 'NULL') || ', ' ||
    COALESCE(quote_literal(tax_id), 'NULL') || ', ' ||
    COALESCE(quote_literal(payment_terms), 'NULL') || ', ' ||
    COALESCE(credit_limit::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(status), 'NULL') || ', ' ||
    COALESCE(quote_literal(assigned_to::text), 'NULL') || '::uuid, ' ||
    COALESCE(annual_revenue::text, 'NULL') || ', ' ||
    COALESCE(employee_count::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(notes), 'NULL') || ', ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as accounts_insert
FROM accounts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for contacts
SELECT
  'INSERT INTO contacts (id, tenant_id, account_id, first_name, last_name, email, phone, job_title, department, address, avatar_url, status, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    COALESCE(quote_literal(account_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(first_name) || ', ' ||
    quote_literal(last_name) || ', ' ||
    COALESCE(quote_literal(email), 'NULL') || ', ' ||
    COALESCE(quote_literal(phone), 'NULL') || ', ' ||
    COALESCE(quote_literal(job_title), 'NULL') || ', ' ||
    COALESCE(quote_literal(department), 'NULL') || ', ' ||
    COALESCE(quote_literal(address::text), 'NULL') || '::jsonb, ' ||
    COALESCE(quote_literal(avatar_url), 'NULL') || ', ' ||
    COALESCE(quote_literal(status), 'NULL') || ', ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as contacts_insert
FROM contacts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for contact_accounts junction table
SELECT
  'INSERT INTO contact_accounts (id, tenant_id, contact_id, account_id, is_primary, relationship_type, created_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    quote_literal(contact_id::text) || '::uuid, ' ||
    quote_literal(account_id::text) || '::uuid, ' ||
    COALESCE(is_primary::text, 'false') || ', ' ||
    COALESCE(quote_literal(relationship_type), 'NULL') || ', ' ||
    quote_literal(created_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as contact_accounts_insert
FROM contact_accounts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for opportunities
SELECT
  'INSERT INTO opportunities (id, tenant_id, account_id, contact_id, name, description, amount, stage, probability, expected_close_date, actual_close_date, mailing_address_line1, mailing_address_line2, mailing_city, mailing_state, mailing_postal_code, mailing_country, date_type, is_converted, converted_at, converted_event_id, owner_id, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    COALESCE(quote_literal(account_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(contact_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(name) || ', ' ||
    COALESCE(quote_literal(description), 'NULL') || ', ' ||
    COALESCE(amount::text, 'NULL') || ', ' ||
    quote_literal(stage) || ', ' ||
    COALESCE(probability::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(expected_close_date::text), 'NULL') || '::date, ' ||
    COALESCE(quote_literal(actual_close_date::text), 'NULL') || '::date, ' ||
    COALESCE(quote_literal(mailing_address_line1), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_address_line2), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_city), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_state), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_postal_code), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_country), 'NULL') || ', ' ||
    COALESCE(quote_literal(date_type), 'NULL') || ', ' ||
    COALESCE(is_converted::text, 'false') || ', ' ||
    COALESCE(quote_literal(converted_at::text), 'NULL') || '::timestamptz, ' ||
    COALESCE(quote_literal(converted_event_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(owner_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as opportunities_insert
FROM opportunities
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for opportunity_line_items
SELECT
  'INSERT INTO opportunity_line_items (id, tenant_id, opportunity_id, item_type, package_id, add_on_id, name, description, quantity, unit_price, total, sort_order, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    quote_literal(opportunity_id::text) || '::uuid, ' ||
    quote_literal(item_type) || ', ' ||
    COALESCE(quote_literal(package_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(add_on_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(name) || ', ' ||
    COALESCE(quote_literal(description), 'NULL') || ', ' ||
    quantity::text || ', ' ||
    unit_price::text || ', ' ||
    total::text || ', ' ||
    COALESCE(sort_order::text, '0') || ', ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as opportunity_line_items_insert
FROM opportunity_line_items
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for locations
SELECT
  'INSERT INTO locations (id, tenant_id, name, address_line1, address_line2, city, state, postal_code, country, contact_name, contact_phone, contact_email, is_one_time, notes, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    quote_literal(name) || ', ' ||
    COALESCE(quote_literal(address_line1), 'NULL') || ', ' ||
    COALESCE(quote_literal(address_line2), 'NULL') || ', ' ||
    COALESCE(quote_literal(city), 'NULL') || ', ' ||
    COALESCE(quote_literal(state), 'NULL') || ', ' ||
    COALESCE(quote_literal(postal_code), 'NULL') || ', ' ||
    COALESCE(quote_literal(country), 'NULL') || ', ' ||
    COALESCE(quote_literal(contact_name), 'NULL') || ', ' ||
    COALESCE(quote_literal(contact_phone), 'NULL') || ', ' ||
    COALESCE(quote_literal(contact_email), 'NULL') || ', ' ||
    COALESCE(is_one_time::text, 'false') || ', ' ||
    COALESCE(quote_literal(notes), 'NULL') || ', ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as locations_insert
FROM locations
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for events
SELECT
  'INSERT INTO events (id, tenant_id, account_id, contact_id, opportunity_id, location_id, title, description, event_type, start_date, end_date, location, status, mailing_address_line1, mailing_address_line2, mailing_city, mailing_state, mailing_postal_code, mailing_country, date_type, converted_from_opportunity_id, setup_time, load_in_notes, event_category_id, event_type_id, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    COALESCE(quote_literal(account_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(contact_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(opportunity_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(location_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(title) || ', ' ||
    COALESCE(quote_literal(description), 'NULL') || ', ' ||
    quote_literal(event_type) || ', ' ||
    quote_literal(start_date::text) || '::timestamptz, ' ||
    COALESCE(quote_literal(end_date::text), 'NULL') || '::timestamptz, ' ||
    COALESCE(quote_literal(location), 'NULL') || ', ' ||
    COALESCE(quote_literal(status), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_address_line1), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_address_line2), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_city), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_state), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_postal_code), 'NULL') || ', ' ||
    COALESCE(quote_literal(mailing_country), 'NULL') || ', ' ||
    COALESCE(quote_literal(date_type), 'NULL') || ', ' ||
    COALESCE(quote_literal(converted_from_opportunity_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(setup_time::text), 'NULL') || '::time, ' ||
    COALESCE(quote_literal(load_in_notes), 'NULL') || ', ' ||
    COALESCE(quote_literal(event_category_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(event_type_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as events_insert
FROM events
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Generate INSERT for event_dates
SELECT
  'INSERT INTO event_dates (id, tenant_id, opportunity_id, event_id, location_id, event_date, start_time, end_time, notes, status, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(tenant_id::text) || '::uuid, ' ||
    COALESCE(quote_literal(opportunity_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(event_id::text), 'NULL') || '::uuid, ' ||
    COALESCE(quote_literal(location_id::text), 'NULL') || '::uuid, ' ||
    quote_literal(event_date::text) || '::date, ' ||
    COALESCE(quote_literal(start_time::text), 'NULL') || '::time, ' ||
    COALESCE(quote_literal(end_time::text), 'NULL') || '::time, ' ||
    COALESCE(quote_literal(notes), 'NULL') || ', ' ||
    COALESCE(quote_literal(status), 'NULL') || ', ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(updated_at::text) || '::timestamptz' ||
    ')',
    ', '
  ) || ' ON CONFLICT (id) DO NOTHING;' as event_dates_insert
FROM event_dates
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- If you have leads, uncomment this:
-- SELECT ... FROM leads WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- If you have quotes, uncomment this:
-- SELECT ... FROM quotes WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- If you have tasks, uncomment this:
-- SELECT ... FROM tasks WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- If you have notes, uncomment this:
-- SELECT ... FROM notes WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- If you have attachments, uncomment this:
-- SELECT ... FROM attachments WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
