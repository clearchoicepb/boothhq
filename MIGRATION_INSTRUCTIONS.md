# Location ID Migration Instructions

## Migration: Add location_id to Events Table

**STATUS**: ✅ COMPLETED - Migration has been successfully applied!

The migration file `supabase/migrations/20251015000000_add_location_id_to_events.sql` has been applied to the database.

## Steps to Apply:

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/djeeircaeqdvfgkczrwx
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251015000000_add_location_id_to_events.sql`
4. Paste into the SQL Editor
5. Click "Run"

### Option 2: Supabase CLI (If you have network access from another machine)
```bash
npx supabase db push
```

## What This Migration Does:

1. Adds `location_id UUID` column to `events` table with foreign key to `locations(id)`
2. Creates an index on `location_id` for performance
3. Adds documentation comments to columns
4. Preserves the old `location` TEXT field for backward compatibility

## Migration SQL:

```sql
-- Add the location_id column
ALTER TABLE events
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_location_id ON events(location_id);

-- Add comments for documentation
COMMENT ON COLUMN events.location_id IS 'Foreign key to locations table - replaces the TEXT location field';
COMMENT ON COLUMN events.location IS 'Legacy TEXT field for location - deprecated in favor of location_id';
```

## Verification:

After applying the migration, you can verify it worked by querying:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('location', 'location_id')
ORDER BY column_name;
```

You should see both columns:
- `location` (text)
- `location_id` (uuid)
