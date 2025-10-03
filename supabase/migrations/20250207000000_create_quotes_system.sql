-- Create Quotes System for Opportunities
-- Quotes are proposals sent to clients before they book (become events)
-- Once an opportunity converts to an event, the quote can be converted to an invoice

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Quote associations
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Quote details
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255),

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE, -- Quote expiration date

  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0, -- Store as decimal (e.g., 0.08 for 8%)
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),

  -- Additional info
  notes TEXT,
  terms TEXT, -- Terms and conditions

  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_line_items table
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Item type and references (same as opportunity_line_items)
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('package', 'add_on', 'custom')),
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  add_on_id UUID REFERENCES add_ons(id) ON DELETE SET NULL,

  -- Item details (captured at time of adding to quote)
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL, -- quantity * unit_price

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX idx_quotes_opportunity_id ON quotes(opportunity_id);
CREATE INDEX idx_quotes_account_id ON quotes(account_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_issue_date ON quotes(issue_date);

CREATE INDEX idx_quote_line_items_tenant_id ON quote_line_items(tenant_id);
CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);
CREATE INDEX idx_quote_line_items_item_type ON quote_line_items(item_type);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotes
CREATE POLICY tenant_isolation_quotes ON quotes
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- RLS policies for quote_line_items
CREATE POLICY tenant_isolation_quote_line_items ON quote_line_items
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Updated_at triggers
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_line_items_updated_at
  BEFORE UPDATE ON quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add invoice_id reference to quotes (for tracking conversion)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add quote_id reference to invoices (for tracking source)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
