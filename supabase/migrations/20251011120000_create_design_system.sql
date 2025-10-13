-- Design System for Events Module
-- Enables tracking of design items, designer assignments, and client approvals

-- ============================================================================
-- TABLE: design_item_types
-- Purpose: Define design templates and item types per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS design_item_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('print', 'digital', 'environmental', 'promotional', 'other')),
  requires_approval BOOLEAN DEFAULT true,
  estimated_hours DECIMAL(5,2),
  default_product_id UUID, -- FK to products table (to be added when products table exists)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_design_type_per_tenant UNIQUE(tenant_id, name)
);

COMMENT ON TABLE design_item_types IS 'Design item templates and types configured per tenant';
COMMENT ON COLUMN design_item_types.category IS 'Broad category: print, digital, environmental, promotional, other';
COMMENT ON COLUMN design_item_types.requires_approval IS 'Whether this design type requires client approval';
COMMENT ON COLUMN design_item_types.estimated_hours IS 'Estimated design time in hours';
COMMENT ON COLUMN design_item_types.default_product_id IS 'Optional link to a product/service offering';

-- ============================================================================
-- TABLE: event_design_items
-- Purpose: Track individual design items for events
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_design_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  design_item_type_id UUID NOT NULL REFERENCES design_item_types(id) ON DELETE RESTRICT,

  -- Design details
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,

  -- Workflow status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'awaiting_approval',
    'approved',
    'needs_revision',
    'completed',
    'cancelled'
  )),

  -- Designer assignment
  assigned_designer_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timeline tracking
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,

  -- Approval tracking
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approval_notes TEXT,
  revision_count INTEGER DEFAULT 0,

  -- File attachments (URLs or references)
  design_file_urls TEXT[], -- Array of file URLs
  proof_file_urls TEXT[],
  final_file_urls TEXT[],

  -- Product integration
  product_id UUID, -- FK to products table (to be added when products table exists)

  -- Notes and metadata
  internal_notes TEXT,
  client_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE event_design_items IS 'Individual design items tracked per event';
COMMENT ON COLUMN event_design_items.status IS 'Workflow status of the design item';
COMMENT ON COLUMN event_design_items.revision_count IS 'Number of times design was sent back for revisions';
COMMENT ON COLUMN event_design_items.design_file_urls IS 'Working design files (PSD, AI, etc)';
COMMENT ON COLUMN event_design_items.proof_file_urls IS 'Client proofs and mockups';
COMMENT ON COLUMN event_design_items.final_file_urls IS 'Print-ready or final delivery files';

-- ============================================================================
-- ALTER TABLE: products
-- Purpose: Add design-related fields to products table
-- NOTE: Commented out until products table exists
-- ============================================================================
-- ALTER TABLE products
--   ADD COLUMN IF NOT EXISTS is_design_item BOOLEAN DEFAULT false,
--   ADD COLUMN IF NOT EXISTS design_category VARCHAR(50);
--
-- COMMENT ON COLUMN products.is_design_item IS 'Flag indicating this product represents a design service';
-- COMMENT ON COLUMN products.design_category IS 'Category for design services (print, digital, etc)';

-- ============================================================================
-- INDEXES
-- Purpose: Optimize query performance
-- ============================================================================

-- Design Item Types indexes
CREATE INDEX IF NOT EXISTS idx_design_item_types_tenant ON design_item_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_design_item_types_active ON design_item_types(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_design_item_types_category ON design_item_types(category);

-- Event Design Items indexes
CREATE INDEX IF NOT EXISTS idx_event_design_items_tenant ON event_design_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_event ON event_design_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_type ON event_design_items(design_item_type_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_status ON event_design_items(status);
CREATE INDEX IF NOT EXISTS idx_event_design_items_designer ON event_design_items(assigned_designer_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_due_date ON event_design_items(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_event_design_items_event_status ON event_design_items(event_id, status);

-- Products design indexes (commented out until products table exists)
-- CREATE INDEX IF NOT EXISTS idx_products_design_item ON products(is_design_item) WHERE is_design_item = true;

-- ============================================================================
-- TRIGGERS
-- Purpose: Automatically update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_design_item_types_updated_at ON design_item_types;
CREATE TRIGGER update_design_item_types_updated_at
  BEFORE UPDATE ON design_item_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_design_items_updated_at ON event_design_items;
CREATE TRIGGER update_event_design_items_updated_at
  BEFORE UPDATE ON event_design_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- Purpose: Secure multi-tenant access
-- ============================================================================

ALTER TABLE design_item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_design_items ENABLE ROW LEVEL SECURITY;

-- Design Item Types policies
DROP POLICY IF EXISTS design_item_types_tenant_isolation ON design_item_types;
CREATE POLICY design_item_types_tenant_isolation ON design_item_types
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Event Design Items policies
DROP POLICY IF EXISTS event_design_items_tenant_isolation ON event_design_items;
CREATE POLICY event_design_items_tenant_isolation ON event_design_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ============================================================================
-- FUNCTION: Create default design types for a tenant
-- Purpose: Bootstrap new tenants with standard design types
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_design_types(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO design_item_types (tenant_id, name, description, category, requires_approval, estimated_hours, display_order)
  VALUES
    (p_tenant_id, 'Event Invitation', 'Printed or digital event invitation', 'print', true, 2.0, 1),
    (p_tenant_id, 'Save the Date', 'Save the date card or email', 'print', true, 1.5, 2),
    (p_tenant_id, 'Program/Menu', 'Event program or menu design', 'print', true, 3.0, 3),
    (p_tenant_id, 'Signage', 'Welcome signs, directional signs, table numbers', 'environmental', true, 2.5, 4),
    (p_tenant_id, 'Place Cards', 'Guest place cards or escort cards', 'print', false, 1.0, 5),
    (p_tenant_id, 'Thank You Card', 'Post-event thank you card', 'print', true, 1.5, 6),
    (p_tenant_id, 'Social Media Graphics', 'Event promotion graphics for social media', 'digital', true, 1.0, 7),
    (p_tenant_id, 'Email Campaign', 'Email header and promotional graphics', 'digital', true, 2.0, 8),
    (p_tenant_id, 'Backdrop/Banner', 'Large format backdrop or banner design', 'environmental', true, 4.0, 9),
    (p_tenant_id, 'Custom Stationery', 'Letterhead, envelopes, custom stationery', 'print', true, 2.5, 10),
    (p_tenant_id, 'Logo Design', 'Event-specific logo or monogram', 'digital', true, 5.0, 11),
    (p_tenant_id, 'Gift Tags/Labels', 'Custom tags, labels, or stickers', 'promotional', false, 1.0, 12)
  ON CONFLICT (tenant_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_design_types IS 'Creates standard design types for a new tenant';

-- ============================================================================
-- SEED: Create default design types for existing tenants
-- Purpose: Bootstrap existing tenants with default types
-- ============================================================================

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    PERFORM create_default_design_types(tenant_record.id);
  END LOOP;

  RAISE NOTICE 'Default design types created for all existing tenants';
END $$;
