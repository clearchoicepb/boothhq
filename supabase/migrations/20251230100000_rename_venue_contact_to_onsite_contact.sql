-- ============================================================================
-- Migration: Rename venue_contact fields to onsite_contact on events table
-- Date: 2025-12-30
-- Description:
--   The events table has fields named venue_contact_name/phone/email which are
--   misleading. These fields actually store the "Onsite Contact" (client's
--   designated person at the event), NOT the venue contact.
--
--   The actual venue contact info comes from the locations table
--   (locations.contact_name/phone/email).
--
--   This migration renames the fields to accurately reflect their purpose:
--   - venue_contact_name -> onsite_contact_name
--   - venue_contact_phone -> onsite_contact_phone
--   - venue_contact_email -> onsite_contact_email
-- ============================================================================

-- Rename venue_contact fields to onsite_contact
ALTER TABLE events RENAME COLUMN venue_contact_name TO onsite_contact_name;
ALTER TABLE events RENAME COLUMN venue_contact_phone TO onsite_contact_phone;
ALTER TABLE events RENAME COLUMN venue_contact_email TO onsite_contact_email;

-- Update comments to clarify purpose
COMMENT ON COLUMN events.onsite_contact_name IS 'Name of the client''s designated person at the event (e.g., HR rep, wedding coordinator, family member). Staff should introduce themselves to this person upon arrival.';
COMMENT ON COLUMN events.onsite_contact_phone IS 'Phone number for the onsite contact';
COMMENT ON COLUMN events.onsite_contact_email IS 'Email for the onsite contact';

-- Add comment to remind about venue contact source
COMMENT ON COLUMN events.location_id IS 'Reference to locations table. The venue contact info (contact_name, contact_phone, contact_email) is stored on the location record, NOT on the event.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SUMMARY OF CONTACT TYPES:
--
-- 1. VENUE CONTACT (from locations table)
--    - Source: locations.contact_name, locations.contact_phone, locations.contact_email
--    - Purpose: Employee of the venue (venue coordinator, banquet manager, etc.)
--    - Used for: Questions about the location before/during event
--
-- 2. ONSITE CONTACT (from events table - this migration)
--    - Source: events.onsite_contact_name, events.onsite_contact_phone, events.onsite_contact_email
--    - Purpose: Client's designated person at the event
--    - Used for: Staff introduces themselves upon arrival
--
-- 3. EVENT PLANNER (from events table - links to contacts)
--    - Source: events.event_planner_id (FK to contacts table)
--    - Fallback: events.event_planner_name, events.event_planner_phone, events.event_planner_email (legacy text fields)
--    - Purpose: Professional third-party event planner coordinating the event
--    - Used for: Main planning contact instead of client directly
-- ============================================================================
