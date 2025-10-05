-- Add payment_status field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_status VARCHAR(100);

-- Create payment_status_options table for tenant customization
CREATE TABLE IF NOT EXISTS payment_status_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Status details
  status_name VARCHAR(100) NOT NULL,
  status_color VARCHAR(50), -- For UI color coding (e.g., 'red', 'yellow', 'green')
  display_order INTEGER DEFAULT 0, -- For sorting options in UI
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate status names per tenant
  UNIQUE(tenant_id, status_name)
);

-- Create indexes
CREATE INDEX idx_payment_status_options_tenant_id ON payment_status_options(tenant_id);
CREATE INDEX idx_payment_status_options_display_order ON payment_status_options(display_order);

-- Disable RLS (using NextAuth, not Supabase Auth)
ALTER TABLE payment_status_options DISABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_payment_status_options_updated_at
  BEFORE UPDATE ON payment_status_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment status options for existing tenants
INSERT INTO payment_status_options (tenant_id, status_name, status_color, display_order, is_active)
SELECT
  id as tenant_id,
  'Not Paid' as status_name,
  'gray' as status_color,
  1 as display_order,
  true as is_active
FROM tenants
ON CONFLICT (tenant_id, status_name) DO NOTHING;

INSERT INTO payment_status_options (tenant_id, status_name, status_color, display_order, is_active)
SELECT
  id as tenant_id,
  'Deposit Paid' as status_name,
  'yellow' as status_color,
  2 as display_order,
  true as is_active
FROM tenants
ON CONFLICT (tenant_id, status_name) DO NOTHING;

INSERT INTO payment_status_options (tenant_id, status_name, status_color, display_order, is_active)
SELECT
  id as tenant_id,
  'Past Due' as status_name,
  'red' as status_color,
  3 as display_order,
  true as is_active
FROM tenants
ON CONFLICT (tenant_id, status_name) DO NOTHING;

INSERT INTO payment_status_options (tenant_id, status_name, status_color, display_order, is_active)
SELECT
  id as tenant_id,
  'Paid in Full' as status_name,
  'green' as status_color,
  4 as display_order,
  true as is_active
FROM tenants
ON CONFLICT (tenant_id, status_name) DO NOTHING;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
