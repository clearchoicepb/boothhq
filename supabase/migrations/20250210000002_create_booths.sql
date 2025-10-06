-- Create booths table
CREATE TABLE IF NOT EXISTS booths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  booth_name VARCHAR(255) NOT NULL,
  booth_type VARCHAR(50) NOT NULL,
  -- Type: open_air, enclosed, 360, mirror, mosaic, custom

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'ready',
  -- Status: ready, deployed, incomplete, maintenance, retired

  -- Current deployment
  assigned_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deployed_date TIMESTAMPTZ,

  -- Required equipment template (JSONB)
  required_items JSONB DEFAULT '{}',
  -- Example: {"cameras": 1, "ipads": 1, "printers": 1, "battery_packs": 2}

  -- Configuration
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Status tracking
  is_complete BOOLEAN DEFAULT false,
  last_deployed_date TIMESTAMPTZ,

  -- Optional
  image_url TEXT,
  qr_code TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  UNIQUE(tenant_id, booth_name)
);

-- Indexes
CREATE INDEX idx_booths_tenant ON booths(tenant_id);
CREATE INDEX idx_booths_status ON booths(status);
CREATE INDEX idx_booths_type ON booths(booth_type);
CREATE INDEX idx_booths_event ON booths(assigned_to_event_id);
CREATE INDEX idx_booths_active ON booths(is_active);

-- Enable RLS
ALTER TABLE booths ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view booths in their tenant"
  ON booths FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert booths in their tenant"
  ON booths FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update booths in their tenant"
  ON booths FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete booths in their tenant"
  ON booths FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Add comments
COMMENT ON TABLE booths IS 'Booth configurations containing multiple equipment items';
COMMENT ON COLUMN booths.required_items IS 'Template defining required equipment quantities';

-- Add foreign key constraint to equipment_items (now that booths table exists)
-- This references the constraint we added in the equipment_items migration
