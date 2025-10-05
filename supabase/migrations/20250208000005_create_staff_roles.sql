-- Create staff_roles table
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('operations', 'event_staff')),
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Create index for performance
CREATE INDEX idx_staff_roles_tenant_active ON staff_roles(tenant_id, is_active);
CREATE INDEX idx_staff_roles_type ON staff_roles(type);

-- Disable RLS (we're using NextAuth, not Supabase Auth)
ALTER TABLE staff_roles DISABLE ROW LEVEL SECURITY;

-- Insert default staff roles for each existing tenant
-- These are inactive by default - tenants need to activate them
DO $$
DECLARE
  tenant_record RECORD;
  role_order INTEGER;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    role_order := 0;

    -- Operations roles
    INSERT INTO staff_roles (tenant_id, name, type, is_active, is_default, sort_order)
    VALUES
      (tenant_record.id, 'Graphic Designer', 'operations', FALSE, TRUE, role_order),
      (tenant_record.id, 'Event Manager', 'operations', FALSE, TRUE, role_order + 1);

    role_order := 0;

    -- Event Staff roles
    INSERT INTO staff_roles (tenant_id, name, type, is_active, is_default, sort_order)
    VALUES
      (tenant_record.id, 'Technician', 'event_staff', FALSE, TRUE, role_order),
      (tenant_record.id, 'Event Host', 'event_staff', FALSE, TRUE, role_order + 1),
      (tenant_record.id, 'Brand Ambassador', 'event_staff', FALSE, TRUE, role_order + 2);
  END LOOP;
END $$;

-- Create trigger to add default roles when new tenant is created
CREATE OR REPLACE FUNCTION create_default_staff_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Operations roles
  INSERT INTO staff_roles (tenant_id, name, type, is_active, is_default, sort_order)
  VALUES
    (NEW.id, 'Graphic Designer', 'operations', FALSE, TRUE, 0),
    (NEW.id, 'Event Manager', 'operations', FALSE, TRUE, 1);

  -- Event Staff roles
  INSERT INTO staff_roles (tenant_id, name, type, is_active, is_default, sort_order)
  VALUES
    (NEW.id, 'Technician', 'event_staff', FALSE, TRUE, 0),
    (NEW.id, 'Event Host', 'event_staff', FALSE, TRUE, 1),
    (NEW.id, 'Brand Ambassador', 'event_staff', FALSE, TRUE, 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_staff_roles
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_default_staff_roles();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
