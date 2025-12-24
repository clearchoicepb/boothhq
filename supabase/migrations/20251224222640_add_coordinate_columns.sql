-- Migration: Add coordinate columns for mileage calculations
-- Date: 2024-12-24
-- Purpose: Store GPS coordinates and Google Place IDs for distance/mileage calculations
--
-- Background:
-- The Google Maps Places API autocomplete captures latitude/longitude coordinates
-- but they were being discarded before storage. This migration adds columns to
-- persist these coordinates for:
-- 1. Staff proximity filtering (show staff near event location)
-- 2. Mileage calculations for payroll (staff home -> event location)
--
-- Columns added:
-- - locations: latitude, longitude, place_id
-- - users: home_latitude, home_longitude, country

-- =============================================================================
-- LOCATIONS TABLE: Add coordinate columns
-- =============================================================================

-- Latitude: -90.0 to +90.0 (8 decimal places = ~1.1mm precision)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

-- Longitude: -180.0 to +180.0 (8 decimal places = ~1.1mm precision)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Google Place ID: Unique identifier for looking up place details
-- Max length ~512 chars but typically 27-50 chars
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS place_id VARCHAR(512);

-- =============================================================================
-- USERS TABLE: Add home coordinate columns
-- =============================================================================

-- Staff home address latitude
ALTER TABLE users
ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8);

-- Staff home address longitude
ALTER TABLE users
ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8);

-- Country for home address (to match locations table pattern)
-- Users table was missing this - contacts and locations have it
ALTER TABLE users
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'US';

-- =============================================================================
-- INDEXES: For geographic proximity queries
-- =============================================================================

-- Composite index on locations for coordinate-based queries
-- Useful for: "Find all locations within X miles of coordinates"
CREATE INDEX IF NOT EXISTS idx_locations_coordinates
ON locations(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Composite index on users for staff proximity filtering
-- Useful for: "Find staff within X miles of event location"
CREATE INDEX IF NOT EXISTS idx_users_home_coordinates
ON users(home_latitude, home_longitude)
WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

-- Index on place_id for Google API lookups
CREATE INDEX IF NOT EXISTS idx_locations_place_id
ON locations(place_id)
WHERE place_id IS NOT NULL;

-- =============================================================================
-- COLUMN DOCUMENTATION
-- =============================================================================

-- Locations table comments
COMMENT ON COLUMN locations.latitude IS 'GPS latitude coordinate from Google Places API. Range: -90 to +90. Used for distance calculations.';
COMMENT ON COLUMN locations.longitude IS 'GPS longitude coordinate from Google Places API. Range: -180 to +180. Used for distance calculations.';
COMMENT ON COLUMN locations.place_id IS 'Google Place ID for looking up additional place details. Captured from Places Autocomplete.';

-- Users table comments
COMMENT ON COLUMN users.home_latitude IS 'Home address GPS latitude. Used for mileage calculations to event locations.';
COMMENT ON COLUMN users.home_longitude IS 'Home address GPS longitude. Used for mileage calculations to event locations.';
COMMENT ON COLUMN users.country IS 'Home address country code (e.g., US, CA). Defaults to US.';

-- =============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================================================

-- Verify locations columns were added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'locations' AND column_name IN ('latitude', 'longitude', 'place_id');

-- Verify users columns were added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name IN ('home_latitude', 'home_longitude', 'country');

-- Verify indexes were created:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('locations', 'users')
-- AND indexname LIKE '%coordinates%' OR indexname LIKE '%place_id%';

-- =============================================================================
-- COMPLETION NOTICE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed: add_coordinate_columns';
    RAISE NOTICE 'Locations table: Added latitude, longitude, place_id columns';
    RAISE NOTICE 'Users table: Added home_latitude, home_longitude, country columns';
    RAISE NOTICE 'Created indexes: idx_locations_coordinates, idx_users_home_coordinates, idx_locations_place_id';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Update AddressInput component to capture coordinates';
    RAISE NOTICE '2. Update location/user API routes to accept coordinates';
    RAISE NOTICE '3. Run backfill script to geocode existing addresses';
END $$;
