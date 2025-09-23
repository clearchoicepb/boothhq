-- Add performance indexes for better query performance

-- Indexes for accounts table
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- Indexes for contacts table
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts(last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Indexes for opportunities table
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);

-- Indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_account_id ON events(account_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
-- CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date); -- Column doesn't exist

-- Indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Indexes for notes table
CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity_id ON notes(entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity_type ON notes(entity_type);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);

-- Indexes for tenant_settings table
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_setting_key ON tenant_settings(setting_key);
