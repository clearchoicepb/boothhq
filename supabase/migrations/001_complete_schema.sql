-- Complete Schema Fix for Supabase CRM App
-- This migration handles all the issues and creates a clean, working schema

-- First, let's clean up any existing problematic policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies that might conflict
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('notes', 'accounts', 'contacts', 'leads', 'opportunities', 'events', 'invoices', 'users', 'tenants', 'tenant_settings')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS tenant_settings CASCADE;

-- =====================================================
-- CORE TENANT & USER MANAGEMENT
-- =====================================================

-- Tenants (Companies/Organizations using the platform)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  domain TEXT,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings JSONB DEFAULT '{}',
  subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (Staff members of tenants)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- =====================================================
-- CRM CORE TABLES
-- =====================================================

-- Accounts (Companies/Organizations)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT DEFAULT 'company' CHECK (account_type IN ('individual', 'company')),
  industry TEXT,
  website TEXT,
  business_url TEXT,
  photo_url TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  credit_limit DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  assigned_to UUID REFERENCES users(id),
  annual_revenue DECIMAL(12,2),
  employee_count INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts (People within accounts)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  department TEXT,
  address JSONB,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads (Potential customers)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunities (Sales opportunities)
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2),
  stage TEXT NOT NULL DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events (Photo booth events)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes (for leads, accounts, and contacts)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'account', 'contact')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Settings
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, setting_key)
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tenant isolation indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_opportunities_tenant_id ON opportunities(tenant_id);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_notes_tenant_id ON notes(tenant_id);

-- Foreign key indexes
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX idx_opportunities_contact_id ON opportunities(contact_id);
CREATE INDEX idx_events_account_id ON events(account_id);
CREATE INDEX idx_events_contact_id ON events(contact_id);
CREATE INDEX idx_events_opportunity_id ON events(opportunity_id);
CREATE INDEX idx_invoices_account_id ON invoices(account_id);
CREATE INDEX idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX idx_invoices_opportunity_id ON invoices(opportunity_id);
CREATE INDEX idx_invoices_event_id ON invoices(event_id);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_notes_entity ON notes(tenant_id, entity_type, entity_id);

-- Search and filter indexes
CREATE INDEX idx_accounts_name ON accounts(name);
CREATE INDEX idx_accounts_account_type ON accounts(account_type);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_contacts_name ON contacts(first_name, last_name);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_type ON leads(lead_type);
CREATE INDEX idx_events_date ON events(start_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit triggers
CREATE TRIGGER audit_tenants_trigger AFTER INSERT OR UPDATE OR DELETE ON tenants FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_users_trigger AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_accounts_trigger AFTER INSERT OR UPDATE OR DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_contacts_trigger AFTER INSERT OR UPDATE OR DELETE ON contacts FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_leads_trigger AFTER INSERT OR UPDATE OR DELETE ON leads FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_opportunities_trigger AFTER INSERT OR UPDATE OR DELETE ON opportunities FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_events_trigger AFTER INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_invoices_trigger AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_invoice_line_items_trigger AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_payments_trigger AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_notes_trigger AFTER INSERT OR UPDATE OR DELETE ON notes FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_tenant_settings_trigger AFTER INSERT OR UPDATE OR DELETE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (using proper conditional logic)
DO $$
BEGIN
    -- Tenants policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'tenant_isolation_tenants') THEN
        CREATE POLICY tenant_isolation_tenants ON tenants FOR ALL USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Users policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'tenant_isolation_users') THEN
        CREATE POLICY tenant_isolation_users ON users FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Accounts policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'tenant_isolation_accounts') THEN
        CREATE POLICY tenant_isolation_accounts ON accounts FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Contacts policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'tenant_isolation_contacts') THEN
        CREATE POLICY tenant_isolation_contacts ON contacts FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Leads policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'tenant_isolation_leads') THEN
        CREATE POLICY tenant_isolation_leads ON leads FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Opportunities policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunities' AND policyname = 'tenant_isolation_opportunities') THEN
        CREATE POLICY tenant_isolation_opportunities ON opportunities FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Events policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'tenant_isolation_events') THEN
        CREATE POLICY tenant_isolation_events ON events FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Invoices policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'tenant_isolation_invoices') THEN
        CREATE POLICY tenant_isolation_invoices ON invoices FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Invoice line items policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'tenant_isolation_invoice_line_items') THEN
        CREATE POLICY tenant_isolation_invoice_line_items ON invoice_line_items FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid));
    END IF;
    
    -- Payments policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'tenant_isolation_payments') THEN
        CREATE POLICY tenant_isolation_payments ON payments FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid));
    END IF;
    
    -- Notes policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'tenant_isolation_notes') THEN
        CREATE POLICY tenant_isolation_notes ON notes FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Tenant settings policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_settings' AND policyname = 'tenant_isolation_tenant_settings') THEN
        CREATE POLICY tenant_isolation_tenant_settings ON tenant_settings FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
    END IF;
    
    -- Audit log policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'tenant_isolation_audit_log') THEN
        CREATE POLICY tenant_isolation_audit_log ON audit_log FOR ALL USING (true);
    END IF;
END $$;

-- Insert a default tenant for testing
INSERT INTO tenants (id, name, subdomain, plan, status) 
VALUES (gen_random_uuid(), 'Default Tenant', 'default', 'starter', 'active')
ON CONFLICT (subdomain) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Schema successfully created with all tables, indexes, triggers, and RLS policies!';
END $$;
