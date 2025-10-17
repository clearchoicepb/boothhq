-- Add location_id to events table to reference the locations table
-- This replaces the simple TEXT location field with a proper foreign key relationship

-- Add the location_id column
ALTER TABLE events
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_location_id ON events(location_id);

-- Add comments for documentation
COMMENT ON COLUMN events.location_id IS 'Foreign key to locations table - replaces the TEXT location field';
COMMENT ON COLUMN events.location IS 'Legacy TEXT field for location - deprecated in favor of location_id';

-- Note: We keep the old `location` TEXT field for backward compatibility
-- New code should use location_id to reference the locations table
-- The location TEXT field can be used as a fallback or for simple text notes
