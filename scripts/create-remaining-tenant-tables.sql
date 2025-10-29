-- ============================================================================
-- CREATE REMAINING BUSINESS TABLES IN TENANT DB
-- ============================================================================
-- Run this SQL in your TENANT DB SQL Editor
-- ============================================================================
-- This creates the remaining business tables that were missing:
-- - invoices & invoice_line_items (billing)
-- - packages, add_ons, opportunity_line_items (pricing/quoting)  
-- - design_item_types & event_design_items (design workflow)
-- - event_core_task_completion (event checklists)
-- ============================================================================

-- ============================================================================
-- PART 1: INVOICES SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id UUID,
  contact_id UUID,
  event_id UUID,
  invoice_number TEXT UNIQUE NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_event_id ON invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Foreign keys
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_account_id_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES accounts(id)
  ON DELETE CASCADE;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_contact_id_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_contact_id_fkey
  FOREIGN KEY (contact_id)
  REFERENCES contacts(id)
  ON DELETE SET NULL;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_event_id_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_event_id_fkey
  FOREIGN KEY (event_id)
  REFERENCES events(id)
  ON DELETE SET NULL;

ALTER TABLE invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_invoice_id_fkey;
ALTER TABLE invoice_line_items
  ADD CONSTRAINT invoice_line_items_invoice_id_fkey
  FOREIGN KEY (invoice_id)
  REFERENCES invoices(id)
  ON DELETE CASCADE;

-- Permissions
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoices TO service_role;
GRANT ALL ON invoices TO postgres;
GRANT ALL ON invoice_line_items TO authenticated;
GRANT ALL ON invoice_line_items TO service_role;
GRANT ALL ON invoice_line_items TO postgres;

-- ============================================================================
-- PART 2: PACKAGES & ADD-ONS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Package details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  
  -- Categorization
  category VARCHAR(50),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Add-on details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'each', -- 'each', 'hour', 'set', 'day', etc.
  
  -- Categorization
  category VARCHAR(50), -- 'props', 'equipment', 'staffing', 'printing', etc.
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunity_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  opportunity_id UUID NOT NULL,
  
  -- Item type and references
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('package', 'add_on', 'custom')),
  package_id UUID,
  add_on_id UUID,
  
  -- Item details (captured at time of adding to opportunity)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL, -- quantity * unit_price
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_packages_tenant_id ON packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);

CREATE INDEX IF NOT EXISTS idx_add_ons_tenant_id ON add_ons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_add_ons_category ON add_ons(category);
CREATE INDEX IF NOT EXISTS idx_add_ons_is_active ON add_ons(is_active);

CREATE INDEX IF NOT EXISTS idx_opportunity_line_items_tenant_id ON opportunity_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_line_items_opportunity_id ON opportunity_line_items(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_line_items_item_type ON opportunity_line_items(item_type);
CREATE INDEX IF NOT EXISTS idx_opportunity_line_items_package_id ON opportunity_line_items(package_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_line_items_add_on_id ON opportunity_line_items(add_on_id);

-- Foreign keys
ALTER TABLE opportunity_line_items
  DROP CONSTRAINT IF EXISTS opportunity_line_items_opportunity_id_fkey;
ALTER TABLE opportunity_line_items
  ADD CONSTRAINT opportunity_line_items_opportunity_id_fkey
  FOREIGN KEY (opportunity_id)
  REFERENCES opportunities(id)
  ON DELETE CASCADE;

ALTER TABLE opportunity_line_items
  DROP CONSTRAINT IF EXISTS opportunity_line_items_package_id_fkey;
ALTER TABLE opportunity_line_items
  ADD CONSTRAINT opportunity_line_items_package_id_fkey
  FOREIGN KEY (package_id)
  REFERENCES packages(id)
  ON DELETE SET NULL;

ALTER TABLE opportunity_line_items
  DROP CONSTRAINT IF EXISTS opportunity_line_items_add_on_id_fkey;
ALTER TABLE opportunity_line_items
  ADD CONSTRAINT opportunity_line_items_add_on_id_fkey
  FOREIGN KEY (add_on_id)
  REFERENCES add_ons(id)
  ON DELETE SET NULL;

-- Permissions
GRANT ALL ON packages TO authenticated;
GRANT ALL ON packages TO service_role;
GRANT ALL ON packages TO postgres;

GRANT ALL ON add_ons TO authenticated;
GRANT ALL ON add_ons TO service_role;
GRANT ALL ON add_ons TO postgres;

GRANT ALL ON opportunity_line_items TO authenticated;
GRANT ALL ON opportunity_line_items TO service_role;
GRANT ALL ON opportunity_line_items TO postgres;

-- ============================================================================
-- PART 3: DESIGN SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS design_item_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('print', 'digital', 'environmental', 'promotional', 'other')),
  requires_approval BOOLEAN DEFAULT true,
  estimated_hours DECIMAL(5,2),
  default_product_id UUID,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_design_type_per_tenant UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS event_design_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  design_item_type_id UUID NOT NULL,
  
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
  assigned_designer_id UUID,
  
  -- Timeline tracking
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  
  -- Approval tracking
  approved_by UUID,
  approval_notes TEXT,
  revision_count INTEGER DEFAULT 0,
  
  -- File attachments
  design_file_urls TEXT[],
  proof_file_urls TEXT[],
  final_file_urls TEXT[],
  
  -- Product integration
  product_id UUID,
  
  -- Notes and metadata
  internal_notes TEXT,
  client_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_item_types_tenant ON design_item_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_design_item_types_active ON design_item_types(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_design_item_types_category ON design_item_types(category);

CREATE INDEX IF NOT EXISTS idx_event_design_items_tenant ON event_design_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_event ON event_design_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_type ON event_design_items(design_item_type_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_status ON event_design_items(status);
CREATE INDEX IF NOT EXISTS idx_event_design_items_designer ON event_design_items(assigned_designer_id);
CREATE INDEX IF NOT EXISTS idx_event_design_items_due_date ON event_design_items(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_event_design_items_event_status ON event_design_items(event_id, status);

-- Foreign keys
ALTER TABLE event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_event_id_fkey;
ALTER TABLE event_design_items
  ADD CONSTRAINT event_design_items_event_id_fkey
  FOREIGN KEY (event_id)
  REFERENCES events(id)
  ON DELETE CASCADE;

ALTER TABLE event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_design_item_type_id_fkey;
ALTER TABLE event_design_items
  ADD CONSTRAINT event_design_items_design_item_type_id_fkey
  FOREIGN KEY (design_item_type_id)
  REFERENCES design_item_types(id)
  ON DELETE RESTRICT;

ALTER TABLE event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_assigned_designer_id_fkey;
ALTER TABLE event_design_items
  ADD CONSTRAINT event_design_items_assigned_designer_id_fkey
  FOREIGN KEY (assigned_designer_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_approved_by_fkey;
ALTER TABLE event_design_items
  ADD CONSTRAINT event_design_items_approved_by_fkey
  FOREIGN KEY (approved_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE event_design_items
  DROP CONSTRAINT IF EXISTS event_design_items_created_by_fkey;
ALTER TABLE event_design_items
  ADD CONSTRAINT event_design_items_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Permissions
GRANT ALL ON design_item_types TO authenticated;
GRANT ALL ON design_item_types TO service_role;
GRANT ALL ON design_item_types TO postgres;
GRANT ALL ON event_design_items TO authenticated;
GRANT ALL ON event_design_items TO service_role;
GRANT ALL ON event_design_items TO postgres;

-- Insert default design types
INSERT INTO design_item_types (tenant_id, name, description, category, requires_approval, estimated_hours, display_order)
VALUES
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Event Invitation', 'Printed or digital event invitation', 'print', true, 2.0, 1),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Save the Date', 'Save the date card or email', 'print', true, 1.5, 2),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Program/Menu', 'Event program or menu design', 'print', true, 3.0, 3),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Signage', 'Welcome signs, directional signs, table numbers', 'environmental', true, 2.5, 4),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Place Cards', 'Guest place cards or escort cards', 'print', false, 1.0, 5),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Thank You Card', 'Post-event thank you card', 'print', true, 1.5, 6),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Social Media Graphics', 'Event promotion graphics for social media', 'digital', true, 1.0, 7),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Email Campaign', 'Email header and promotional graphics', 'digital', true, 2.0, 8),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Backdrop/Banner', 'Large format backdrop or banner design', 'environmental', true, 4.0, 9),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Custom Stationery', 'Letterhead, envelopes, custom stationery', 'print', true, 2.5, 10),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Logo Design', 'Event-specific logo or monogram', 'digital', true, 5.0, 11),
  ('5f98f4c0-5254-4c61-8633-55ea049c7f18', 'Gift Tags/Labels', 'Custom tags, labels, or stickers', 'promotional', false, 1.0, 12)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- PART 4: EVENT CORE TASKS COMPLETION
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_core_task_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  core_task_template_id UUID NOT NULL,
  
  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one completion record per event per task
  UNIQUE(event_id, core_task_template_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_core_task_completion_event_id ON event_core_task_completion(event_id);
CREATE INDEX IF NOT EXISTS idx_event_core_task_completion_tenant_id ON event_core_task_completion(tenant_id);

-- Foreign keys
ALTER TABLE event_core_task_completion
  DROP CONSTRAINT IF EXISTS event_core_task_completion_event_id_fkey;
ALTER TABLE event_core_task_completion
  ADD CONSTRAINT event_core_task_completion_event_id_fkey
  FOREIGN KEY (event_id)
  REFERENCES events(id)
  ON DELETE CASCADE;

ALTER TABLE event_core_task_completion
  DROP CONSTRAINT IF EXISTS event_core_task_completion_core_task_template_id_fkey;
ALTER TABLE event_core_task_completion
  ADD CONSTRAINT event_core_task_completion_core_task_template_id_fkey
  FOREIGN KEY (core_task_template_id)
  REFERENCES core_task_templates(id)
  ON DELETE CASCADE;

ALTER TABLE event_core_task_completion
  DROP CONSTRAINT IF EXISTS event_core_task_completion_completed_by_fkey;
ALTER TABLE event_core_task_completion
  ADD CONSTRAINT event_core_task_completion_completed_by_fkey
  FOREIGN KEY (completed_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Permissions
GRANT ALL ON event_core_task_completion TO authenticated;
GRANT ALL ON event_core_task_completion TO service_role;
GRANT ALL ON event_core_task_completion TO postgres;

-- ============================================================================
-- RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check new tables
SELECT 'invoices' as table_name, COUNT(*) as count FROM invoices
UNION ALL
SELECT 'invoice_line_items', COUNT(*) FROM invoice_line_items
UNION ALL
SELECT 'packages', COUNT(*) FROM packages
UNION ALL
SELECT 'add_ons', COUNT(*) FROM add_ons
UNION ALL
SELECT 'opportunity_line_items', COUNT(*) FROM opportunity_line_items
UNION ALL
SELECT 'design_item_types', COUNT(*) FROM design_item_types
UNION ALL
SELECT 'event_design_items', COUNT(*) FROM event_design_items
UNION ALL
SELECT 'event_core_task_completion', COUNT(*) FROM event_core_task_completion;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- All business tables now exist in Tenant DB:
-- ✅ Invoicing system (invoices, invoice_line_items)
-- ✅ Pricing/Quoting system (packages, add_ons, opportunity_line_items)
-- ✅ Design workflow (design_item_types, event_design_items)
-- ✅ Event checklists (event_core_task_completion)
-- 
-- Total tables created: 8
-- Total design templates: 12 (default)
-- ============================================================================

