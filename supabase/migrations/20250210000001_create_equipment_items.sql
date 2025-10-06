-- Create equipment_items table
CREATE TABLE IF NOT EXISTS equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  item_id VARCHAR(50) NOT NULL, -- User-friendly ID like C107, HS111
  equipment_type VARCHAR(100) NOT NULL, -- Camera, Printer, iPad, etc.
  model VARCHAR(100),
  name VARCHAR(255) NOT NULL, -- Display name

  -- Tracking
  serial_number VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  -- Status: available, assigned_to_booth, deployed, maintenance, retired

  location VARCHAR(255), -- Office, person name, etc.

  -- Assignment
  booth_id UUID REFERENCES booths(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  assigned_date TIMESTAMPTZ,

  -- Condition & Maintenance
  condition VARCHAR(50) DEFAULT 'good',
  -- Condition: excellent, good, fair, needs_repair
  notes TEXT,
  last_checked_date TIMESTAMPTZ,

  -- Equipment-specific metadata (stored as JSONB for flexibility)
  metadata JSONB DEFAULT '{}',
  -- Can store: internet, memory_card, printer_cover, eid_number, etc.

  -- Optional
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  UNIQUE(tenant_id, item_id)
);

-- Indexes for performance
CREATE INDEX idx_equipment_items_tenant ON equipment_items(tenant_id);
CREATE INDEX idx_equipment_items_status ON equipment_items(status);
CREATE INDEX idx_equipment_items_booth ON equipment_items(booth_id);
CREATE INDEX idx_equipment_items_type ON equipment_items(equipment_type);
CREATE INDEX idx_equipment_items_event ON equipment_items(assigned_to_event_id);

-- Enable RLS
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view equipment in their tenant"
  ON equipment_items FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert equipment in their tenant"
  ON equipment_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update equipment in their tenant"
  ON equipment_items FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete equipment in their tenant"
  ON equipment_items FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Add comments
COMMENT ON TABLE equipment_items IS 'Individual equipment items tracked in inventory';
COMMENT ON COLUMN equipment_items.item_id IS 'User-friendly identifier like C107, HS111';
COMMENT ON COLUMN equipment_items.metadata IS 'Equipment-specific fields stored as JSON';
