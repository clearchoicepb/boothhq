/**
 * TENANT DATA DATABASE SCHEMA - Exact Match to Application DB
 * Generated from actual application database columns
 * Run this in your TENANT DATA database
 */

-- =====================================================
-- ACCOUNTS
-- =====================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  account_type TEXT DEFAULT 'company' CHECK (account_type IN ('individual', 'company')),
  industry TEXT,
  website TEXT,
  business_url TEXT,
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  -- Billing Address (both JSONB and individual fields)
  billing_address JSONB,
  billing_address_line_1 TEXT,
  billing_address_line_2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip_code TEXT,
  -- Shipping Address (both JSONB and individual fields)
  shipping_address JSONB,
  shipping_address_line_1 TEXT,
  shipping_address_line_2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip_code TEXT,
  -- Financial
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  credit_limit DECIMAL(10,2),
  annual_revenue DECIMAL(12,2),
  employee_count INTEGER,
  -- Management
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONTACTS
-- =====================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  department TEXT,
  -- Address (both JSONB and individual fields)
  address JSONB,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONTACT_ACCOUNTS (Junction Table)
-- =====================================================
CREATE TABLE contact_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  role TEXT,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, account_id)
);

-- =====================================================
-- LEADS
-- =====================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lead_type TEXT DEFAULT 'personal' CHECK (lead_type IN ('personal', 'company')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  company_url TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  source TEXT,
  notes TEXT,
  is_converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_account_id UUID REFERENCES accounts(id),
  converted_contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- OPPORTUNITIES
-- =====================================================
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2),
  stage TEXT NOT NULL DEFAULT 'prospecting',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  -- Dates
  event_type TEXT,
  event_date DATE,
  initial_date DATE,
  final_date DATE,
  date_type TEXT,
  expected_close_date DATE,
  actual_close_date DATE,
  -- Mailing Address
  mailing_address_line1 TEXT,
  mailing_address_line2 TEXT,
  mailing_city TEXT,
  mailing_state TEXT,
  mailing_postal_code TEXT,
  mailing_country TEXT DEFAULT 'US',
  -- Closure
  close_notes TEXT,
  close_reason TEXT,
  -- Conversion
  is_converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_event_id UUID,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- OPPORTUNITY_LINE_ITEMS
-- =====================================================
CREATE TABLE opportunity_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  item_type TEXT,
  name TEXT,
  description TEXT NOT NULL,
  product_id UUID,
  package_id UUID,
  add_on_id UUID,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LOCATIONS
-- =====================================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_one_time BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EVENTS
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  converted_from_opportunity_id UUID,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  event_type_id UUID,
  event_category_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  date_type TEXT,
  -- Dates and Times
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  setup_time TIME,
  load_in_time TIME,
  load_in_notes TEXT,
  -- Location
  location TEXT,
  -- Mailing Address
  mailing_address_line1 TEXT,
  mailing_address_line2 TEXT,
  mailing_city TEXT,
  mailing_state TEXT,
  mailing_postal_code TEXT,
  mailing_country TEXT DEFAULT 'US',
  -- Event Planner Contact
  event_planner_id UUID,
  event_planner_name TEXT,
  event_planner_email TEXT,
  event_planner_phone TEXT,
  -- Venue Contact
  venue_contact_name TEXT,
  venue_contact_email TEXT,
  venue_contact_phone TEXT,
  -- Workflow Tracking
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  payment_status TEXT,
  design_request_submitted BOOLEAN DEFAULT FALSE,
  design_form_submitted BOOLEAN DEFAULT FALSE,
  design_form_submitted_date DATE,
  logistics_form_submitted BOOLEAN DEFAULT FALSE,
  logistics_form_submitted_date DATE,
  backdrop_design_complete BOOLEAN DEFAULT FALSE,
  props_design_complete BOOLEAN DEFAULT FALSE,
  client_approval_received BOOLEAN DEFAULT FALSE,
  production_files_ready BOOLEAN DEFAULT FALSE,
  equipment_assigned BOOLEAN DEFAULT FALSE,
  equipment_assigned_date DATE,
  software_configured BOOLEAN DEFAULT FALSE,
  software_configured_date DATE,
  staff_assigned BOOLEAN DEFAULT FALSE,
  staff_notified BOOLEAN DEFAULT FALSE,
  staff_notified_date DATE,
  setup_time_scheduled BOOLEAN DEFAULT FALSE,
  transportation_arranged BOOLEAN DEFAULT FALSE,
  venue_confirmed BOOLEAN DEFAULT FALSE,
  venue_confirmed_date DATE,
  final_confirmation_sent BOOLEAN DEFAULT FALSE,
  final_confirmation_sent_date DATE,
  event_brief_created BOOLEAN DEFAULT FALSE,
  event_brief_created_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EVENT_DATES
-- =====================================================
CREATE TABLE event_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TASKS
-- =====================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  created_by UUID,
  entity_type TEXT CHECK (entity_type IN ('account', 'contact', 'lead', 'opportunity', 'event', 'event_date')),
  entity_id UUID,
  event_date_id UUID REFERENCES event_dates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTES
-- =====================================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'account', 'contact', 'opportunity', 'event', 'task')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ATTACHMENTS
-- =====================================================
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account', 'contact', 'lead', 'opportunity', 'event', 'invoice', 'quote', 'task')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMMUNICATIONS
-- =====================================================
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'phone', 'meeting', 'note', 'sms')),
  communication_date TIMESTAMP WITH TIME ZONE,
  subject TEXT,
  notes TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  status TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contact_accounts_tenant_id ON contact_accounts(tenant_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_opportunities_tenant_id ON opportunities(tenant_id);
CREATE INDEX idx_opportunity_line_items_tenant_id ON opportunity_line_items(tenant_id);
CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_event_dates_tenant_id ON event_dates(tenant_id);
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX idx_communications_tenant_id ON communications(tenant_id);

CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contact_accounts_contact_id ON contact_accounts(contact_id);
CREATE INDEX idx_contact_accounts_account_id ON contact_accounts(account_id);
CREATE INDEX idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX idx_opportunities_contact_id ON opportunities(contact_id);
CREATE INDEX idx_opportunity_line_items_opportunity_id ON opportunity_line_items(opportunity_id);
CREATE INDEX idx_events_account_id ON events(account_id);
CREATE INDEX idx_events_contact_id ON events(contact_id);
CREATE INDEX idx_events_opportunity_id ON events(opportunity_id);
CREATE INDEX idx_events_location_id ON events(location_id);
CREATE INDEX idx_event_dates_event_id ON event_dates(event_id);
CREATE INDEX idx_tasks_entity ON tasks(tenant_id, entity_type, entity_id);
CREATE INDEX idx_notes_entity ON notes(tenant_id, entity_type, entity_id);
CREATE INDEX idx_attachments_entity ON attachments(tenant_id, entity_type, entity_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all tables
CREATE POLICY "Service role bypass" ON accounts FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON contacts FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON contact_accounts FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON leads FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON opportunities FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON opportunity_line_items FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON locations FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON events FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON event_dates FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON tasks FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON notes FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON attachments FOR ALL USING (true);
CREATE POLICY "Service role bypass" ON communications FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_accounts_updated_at BEFORE UPDATE ON contact_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunity_line_items_updated_at BEFORE UPDATE ON opportunity_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_dates_updated_at BEFORE UPDATE ON event_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

