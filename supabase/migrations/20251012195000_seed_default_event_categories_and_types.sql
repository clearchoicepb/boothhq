-- ═══════════════════════════════════════════════════════════
-- IDEMPOTENT SEED: Event Categories and Types
-- ═══════════════════════════════════════════════════════════
-- This migration can be safely run multiple times.
-- Uses ON CONFLICT to handle existing data.

BEGIN;

-- Advisory lock to prevent concurrent execution
SELECT pg_advisory_xact_lock(864201_001);

-- ═══════════════════════════════════════════════════════════
-- PART 1: SEED DEFAULT EVENT CATEGORIES (IDEMPOTENT)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  tenant_record RECORD;
  social_category_id UUID;
  corporate_category_id UUID;
BEGIN
  -- Loop through all tenants
  FOR tenant_record IN SELECT id FROM tenants LOOP

    -- Insert or update Social Event category
    INSERT INTO event_categories (
      tenant_id,
      name,
      slug,
      description,
      color,
      icon,
      is_active,
      is_system_default,
      display_order
    ) VALUES (
      tenant_record.id,
      'Social Event',
      'social-event',
      'Entertainment-focused events like weddings, parties, and celebrations',
      '#EC4899',
      'users',
      true,
      true,
      1
    )
    ON CONFLICT (tenant_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      color = EXCLUDED.color,
      icon = EXCLUDED.icon,
      is_active = EXCLUDED.is_active,
      is_system_default = EXCLUDED.is_system_default,
      display_order = EXCLUDED.display_order
    RETURNING id INTO social_category_id;

    -- If we didn't get an ID from RETURNING (because of update), fetch it
    IF social_category_id IS NULL THEN
      SELECT id INTO social_category_id
      FROM event_categories
      WHERE tenant_id = tenant_record.id AND slug = 'social-event';
    END IF;

    -- Insert or update Corporate Event category
    INSERT INTO event_categories (
      tenant_id,
      name,
      slug,
      description,
      color,
      icon,
      is_active,
      is_system_default,
      display_order
    ) VALUES (
      tenant_record.id,
      'Corporate Event',
      'corporate-event',
      'Business events including marketing activations, conferences, and corporate functions',
      '#3B82F6',
      'building',
      true,
      true,
      2
    )
    ON CONFLICT (tenant_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      color = EXCLUDED.color,
      icon = EXCLUDED.icon,
      is_active = EXCLUDED.is_active,
      is_system_default = EXCLUDED.is_system_default,
      display_order = EXCLUDED.display_order
    RETURNING id INTO corporate_category_id;

    -- If we didn't get an ID from RETURNING, fetch it
    IF corporate_category_id IS NULL THEN
      SELECT id INTO corporate_category_id
      FROM event_categories
      WHERE tenant_id = tenant_record.id AND slug = 'corporate-event';
    END IF;

    -- Insert Social Event types (idempotent)
    INSERT INTO event_types (tenant_id, event_category_id, name, slug, is_system_default, display_order, is_active)
    VALUES
      (tenant_record.id, social_category_id, 'Wedding', 'wedding', true, 1, true),
      (tenant_record.id, social_category_id, 'Birthday Party', 'birthday-party', true, 2, true),
      (tenant_record.id, social_category_id, 'Sweet 16', 'sweet-16', true, 3, true),
      (tenant_record.id, social_category_id, 'Bar/Bat Mitzvah', 'bar-bat-mitzvah', true, 4, true),
      (tenant_record.id, social_category_id, 'Quinceañera', 'quinceanera', true, 5, true),
      (tenant_record.id, social_category_id, 'Holiday Party', 'holiday-party', true, 6, true),
      (tenant_record.id, social_category_id, 'Graduation Party', 'graduation-party', true, 7, true),
      (tenant_record.id, social_category_id, 'School Dance', 'school-dance', true, 8, true),
      (tenant_record.id, social_category_id, 'Misc School Event', 'misc-school-event', true, 9, true),
      (tenant_record.id, social_category_id, 'Misc Social Event', 'misc-social-event', true, 10, true)
    ON CONFLICT (tenant_id, event_category_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      is_system_default = EXCLUDED.is_system_default,
      display_order = EXCLUDED.display_order,
      is_active = EXCLUDED.is_active;

    -- Insert Corporate Event types (idempotent)
    INSERT INTO event_types (tenant_id, event_category_id, name, slug, is_system_default, display_order, is_active)
    VALUES
      (tenant_record.id, corporate_category_id, 'Marketing Activation', 'marketing-activation', true, 1, true),
      (tenant_record.id, corporate_category_id, 'Convention', 'convention', true, 2, true),
      (tenant_record.id, corporate_category_id, 'Conference', 'conference', true, 3, true),
      (tenant_record.id, corporate_category_id, 'Internal Corporate Event', 'internal-corporate-event', true, 4, true),
      (tenant_record.id, corporate_category_id, 'Misc Corporate Event', 'misc-corporate-event', true, 5, true)
    ON CONFLICT (tenant_id, event_category_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      is_system_default = EXCLUDED.is_system_default,
      display_order = EXCLUDED.display_order,
      is_active = EXCLUDED.is_active;

    RAISE NOTICE 'Seeded/updated categories and types for tenant: %', tenant_record.id;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- PART 2: CREATE TRIGGER FUNCTION FOR NEW TENANTS
-- ═══════════════════════════════════════════════════════════

-- Drop existing function if it exists
DROP TRIGGER IF EXISTS trigger_initialize_tenant_event_categories ON tenants;
DROP FUNCTION IF EXISTS initialize_tenant_event_categories();

-- Function to initialize event categories and types for new tenant
CREATE OR REPLACE FUNCTION initialize_tenant_event_categories()
RETURNS TRIGGER AS $$
DECLARE
  social_category_id UUID;
  corporate_category_id UUID;
BEGIN
  -- Insert Social Event category
  INSERT INTO event_categories (
    tenant_id, name, slug, description, color, icon,
    is_active, is_system_default, display_order
  ) VALUES (
    NEW.id, 'Social Event', 'social-event',
    'Entertainment-focused events like weddings, parties, and celebrations',
    '#EC4899', 'users', true, true, 1
  )
  ON CONFLICT (tenant_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO social_category_id;

  -- Fetch ID if it was an update
  IF social_category_id IS NULL THEN
    SELECT id INTO social_category_id
    FROM event_categories
    WHERE tenant_id = NEW.id AND slug = 'social-event';
  END IF;

  -- Insert Corporate Event category
  INSERT INTO event_categories (
    tenant_id, name, slug, description, color, icon,
    is_active, is_system_default, display_order
  ) VALUES (
    NEW.id, 'Corporate Event', 'corporate-event',
    'Business events including marketing activations, conferences, and corporate functions',
    '#3B82F6', 'building', true, true, 2
  )
  ON CONFLICT (tenant_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO corporate_category_id;

  -- Fetch ID if it was an update
  IF corporate_category_id IS NULL THEN
    SELECT id INTO corporate_category_id
    FROM event_categories
    WHERE tenant_id = NEW.id AND slug = 'corporate-event';
  END IF;

  -- Social Event types
  INSERT INTO event_types (tenant_id, event_category_id, name, slug, is_system_default, display_order, is_active)
  VALUES
    (NEW.id, social_category_id, 'Wedding', 'wedding', true, 1, true),
    (NEW.id, social_category_id, 'Birthday Party', 'birthday-party', true, 2, true),
    (NEW.id, social_category_id, 'Sweet 16', 'sweet-16', true, 3, true),
    (NEW.id, social_category_id, 'Bar/Bat Mitzvah', 'bar-bat-mitzvah', true, 4, true),
    (NEW.id, social_category_id, 'Quinceañera', 'quinceanera', true, 5, true),
    (NEW.id, social_category_id, 'Holiday Party', 'holiday-party', true, 6, true),
    (NEW.id, social_category_id, 'Graduation Party', 'graduation-party', true, 7, true),
    (NEW.id, social_category_id, 'School Dance', 'school-dance', true, 8, true),
    (NEW.id, social_category_id, 'Misc School Event', 'misc-school-event', true, 9, true),
    (NEW.id, social_category_id, 'Misc Social Event', 'misc-social-event', true, 10, true)
  ON CONFLICT (tenant_id, event_category_id, slug) DO NOTHING;

  -- Corporate Event types
  INSERT INTO event_types (tenant_id, event_category_id, name, slug, is_system_default, display_order, is_active)
  VALUES
    (NEW.id, corporate_category_id, 'Marketing Activation', 'marketing-activation', true, 1, true),
    (NEW.id, corporate_category_id, 'Convention', 'convention', true, 2, true),
    (NEW.id, corporate_category_id, 'Conference', 'conference', true, 3, true),
    (NEW.id, corporate_category_id, 'Internal Corporate Event', 'internal-corporate-event', true, 4, true),
    (NEW.id, corporate_category_id, 'Misc Corporate Event', 'misc-corporate-event', true, 5, true)
  ON CONFLICT (tenant_id, event_category_id, slug) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tenants table
CREATE TRIGGER trigger_initialize_tenant_event_categories
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tenant_event_categories();

-- Comments
COMMENT ON FUNCTION initialize_tenant_event_categories() IS 'Auto-seeds event categories and types for new tenants (idempotent)';

COMMIT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
