-- ═══════════════════════════════════════════════════════════
-- PART 1: CREATE EVENT_CATEGORIES TABLE
-- ═══════════════════════════════════════════════════════════

-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Category details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- For URL-safe identification
  description TEXT,
  color VARCHAR(7), -- Hex color code for UI (e.g., '#3B82F6')
  icon VARCHAR(50), -- Icon identifier (e.g., 'users', 'building')

  -- Configuration
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false, -- Marks default categories (Social, Corporate)
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  UNIQUE(tenant_id, slug),
  UNIQUE(tenant_id, display_order)
);

-- Indexes
CREATE INDEX idx_event_categories_tenant_id ON event_categories(tenant_id);
CREATE INDEX idx_event_categories_slug ON event_categories(slug);
CREATE INDEX idx_event_categories_is_active ON event_categories(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_event_categories_updated_at
  BEFORE UPDATE ON event_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE event_categories IS 'Event categories define workflow types (Social vs Corporate)';
COMMENT ON COLUMN event_categories.is_system_default IS 'System defaults cannot be deleted, only deactivated';

-- ═══════════════════════════════════════════════════════════
-- PART 2: CREATE EVENT_TYPES TABLE
-- ═══════════════════════════════════════════════════════════

-- Create event_types table
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,

  -- Type details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,

  -- Configuration
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false, -- Marks default types (Wedding, Conference, etc.)
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  UNIQUE(tenant_id, event_category_id, slug),
  UNIQUE(tenant_id, event_category_id, display_order)
);

-- Indexes
CREATE INDEX idx_event_types_tenant_id ON event_types(tenant_id);
CREATE INDEX idx_event_types_category_id ON event_types(event_category_id);
CREATE INDEX idx_event_types_slug ON event_types(slug);
CREATE INDEX idx_event_types_is_active ON event_types(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE event_types IS 'Event types are specific events within a category (Wedding, Conference)';
COMMENT ON COLUMN event_types.event_category_id IS 'References the parent category (Social/Corporate)';

-- ═══════════════════════════════════════════════════════════
-- PART 3: UPDATE EVENTS TABLE
-- ═══════════════════════════════════════════════════════════

-- Add new columns to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_category_id UUID REFERENCES event_categories(id),
  ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_event_category_id ON events(event_category_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type_id ON events(event_type_id);

-- Keep old event_type column for now (for migration)
-- We'll remove it in a later migration after data is migrated

-- Comments
COMMENT ON COLUMN events.event_category_id IS 'New category system - replaces old event_type TEXT';
COMMENT ON COLUMN events.event_type_id IS 'New type system - references specific event type';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
