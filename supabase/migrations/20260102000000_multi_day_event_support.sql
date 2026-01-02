-- ============================================================================
-- Migration: Multi-Day Event Support
-- Date: 2026-01-02
-- Description:
--   Adds support for multi-day events across public pages and forms:
--
--   1. event_dates: Add per-date onsite contact fields (inherit/override pattern)
--   2. event_forms: Add optional event_date_id for per-date forms
--   3. staff_forms: Add event_date_id for per-date staff recaps, update unique constraint
--
--   Pattern: "Inherit with Override" - per-date fields default to NULL meaning
--   "inherit from event", but can be overridden with specific values.
-- ============================================================================

-- ===========================================
-- 1. EVENT_DATES: Add per-date onsite contact
-- ===========================================

-- Add onsite contact fields to event_dates
-- When NULL, inherit from events table. When set, override for this specific date.
ALTER TABLE event_dates
ADD COLUMN IF NOT EXISTS onsite_contact_name TEXT,
ADD COLUMN IF NOT EXISTS onsite_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS onsite_contact_email TEXT;

COMMENT ON COLUMN event_dates.onsite_contact_name IS
  'Per-date onsite contact name. When NULL, inherit from events.onsite_contact_name. When set, overrides for this date.';
COMMENT ON COLUMN event_dates.onsite_contact_phone IS
  'Per-date onsite contact phone. When NULL, inherit from events.onsite_contact_phone. When set, overrides for this date.';
COMMENT ON COLUMN event_dates.onsite_contact_email IS
  'Per-date onsite contact email. When NULL, inherit from events.onsite_contact_email. When set, overrides for this date.';

-- ===========================================
-- 2. EVENT_FORMS: Add optional event_date_id
-- ===========================================

-- Add event_date_id for date-specific forms
-- NULL means form is shared across all dates, set means form is for specific date
ALTER TABLE event_forms
ADD COLUMN IF NOT EXISTS event_date_id UUID REFERENCES event_dates(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_event_forms_event_date ON event_forms(event_date_id);

COMMENT ON COLUMN event_forms.event_date_id IS
  'Optional link to specific event date. NULL = shared form for all dates. Set = form specific to this date.';

-- ===========================================
-- 3. STAFF_FORMS: Add event_date_id
-- ===========================================

-- Add event_date_id for per-date staff recaps
ALTER TABLE staff_forms
ADD COLUMN IF NOT EXISTS event_date_id UUID REFERENCES event_dates(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_forms_event_date ON staff_forms(event_date_id);

COMMENT ON COLUMN staff_forms.event_date_id IS
  'Links to specific event date for per-date staff recaps. Required for multi-day events.';

-- Update unique constraint: allow one form per staff assignment per date
-- (existing constraint was per staff per event, now it's per staff per date)

-- First, drop the existing unique constraint
ALTER TABLE staff_forms DROP CONSTRAINT IF EXISTS staff_forms_event_id_staff_assignment_id_key;

-- Add new constraint: one form per staff assignment per date
-- Use COALESCE to handle NULL event_date_id (for legacy single-date events)
-- This creates a partial unique index that handles both cases:
-- 1. For forms WITH event_date_id: unique on (staff_assignment_id, event_date_id)
-- 2. For forms WITHOUT event_date_id (legacy): unique on (staff_assignment_id) when event_date_id IS NULL

-- Create unique index for forms with event_date_id
CREATE UNIQUE INDEX IF NOT EXISTS staff_forms_assignment_date_unique
ON staff_forms(staff_assignment_id, event_date_id)
WHERE event_date_id IS NOT NULL;

-- Create unique index for legacy forms without event_date_id (one per assignment per event)
CREATE UNIQUE INDEX IF NOT EXISTS staff_forms_assignment_event_unique
ON staff_forms(staff_assignment_id, event_id)
WHERE event_date_id IS NULL;

-- ===========================================
-- Notify PostgREST to reload schema
-- ===========================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SUMMARY:
--
-- event_dates:
--   + onsite_contact_name TEXT (NULL = inherit from event)
--   + onsite_contact_phone TEXT (NULL = inherit from event)
--   + onsite_contact_email TEXT (NULL = inherit from event)
--
-- event_forms:
--   + event_date_id UUID (NULL = shared form, set = per-date form)
--
-- staff_forms:
--   + event_date_id UUID (links to specific date for per-date recaps)
--   - Removed: unique(event_id, staff_assignment_id)
--   + Added: unique(staff_assignment_id, event_date_id) WHERE event_date_id IS NOT NULL
--   + Added: unique(staff_assignment_id, event_id) WHERE event_date_id IS NULL
-- ============================================================================
