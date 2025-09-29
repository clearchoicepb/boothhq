# Manual Migration Instructions

## 🎯 Purpose
Add date type functionality to opportunities and events tables to support:
- Single Day events
- Same Location - Sequential Dates
- Series of Events - Same Location
- Multiple Events - Multiple Locations

## 🔧 Migration Steps

### 1. Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query

### 2. Run the Migration SQL
Copy and paste this SQL code into the SQL Editor and execute it:

```sql
-- Add event-related fields to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS initial_date DATE,
ADD COLUMN IF NOT EXISTS final_date DATE,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Add index for lead_id
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);

-- Add constraint to ensure date_type is valid
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_date_type'
  ) THEN
    ALTER TABLE opportunities 
    ADD CONSTRAINT check_date_type 
    CHECK (date_type IN ('single', 'multiple'));
  END IF;
END $$;

-- Add constraint to ensure proper date fields are set based on date_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_date_fields'
  ) THEN
    ALTER TABLE opportunities 
    ADD CONSTRAINT check_date_fields 
    CHECK (
      (date_type = 'single' AND event_date IS NOT NULL AND initial_date IS NULL AND final_date IS NULL) OR
      (date_type = 'multiple' AND event_date IS NULL AND initial_date IS NOT NULL AND final_date IS NOT NULL AND initial_date <= final_date)
    );
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN opportunities.event_type IS 'Type of event (wedding, corporate, etc.)';
COMMENT ON COLUMN opportunities.date_type IS 'Whether this is a single day or multiple day event';
COMMENT ON COLUMN opportunities.event_date IS 'Date for single day events';
COMMENT ON COLUMN opportunities.initial_date IS 'Start date for multiple day events';
COMMENT ON COLUMN opportunities.final_date IS 'End date for multiple day events';
COMMENT ON COLUMN opportunities.lead_id IS 'Reference to lead if opportunity was created from a lead';
```

### 3. Verify the Migration
After running the migration, verify it worked by running this test query:

```sql
-- Test the new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name IN ('event_type', 'event_date', 'initial_date', 'final_date', 'lead_id');
```

You should see all 5 new columns listed.

### 4. Test Creating an Opportunity
Test that the new functionality works:

```sql
-- Test creating an opportunity with new fields
INSERT INTO opportunities (
  tenant_id, 
  name, 
  stage, 
  event_type, 
  date_type, 
  event_date
) VALUES (
  '1a174060-deb6-4502-ad21-a5fccd875f23',
  'Test Wedding Opportunity',
  'prospecting',
  'wedding',
  'single',
  '2025-12-31'
);

-- Clean up test record
DELETE FROM opportunities WHERE name = 'Test Wedding Opportunity';
```

## ✅ What This Enables

After the migration, the polymorphic forms will support:

### 📅 Date Type Options:
1. **Single Day** - One event date
2. **Same Location - Sequential Dates** - Multiple dates at same location in sequence
3. **Series of Events - Same Location** - Multiple dates at same location (non-sequential)
4. **Multiple Events - Multiple Locations** - Multiple dates at different locations

### 🎯 Form Features:
- **Dynamic Date Fields** - Shows appropriate date fields based on selection
- **Event Type Selection** - Wedding, Corporate, Birthday, etc.
- **Lead Integration** - Link opportunities to leads
- **Validation** - Ensures proper date combinations

## 🚨 Important Notes

- **Safe Migration**: This migration only adds columns and constraints
- **No Data Loss**: Existing data will remain intact
- **Backward Compatible**: Existing functionality will continue to work
- **RLS Compliant**: All new fields respect tenant isolation

## 🧪 After Migration

1. **Test Opportunity Creation** - Try creating opportunities with different date types
2. **Test Event Creation** - Try creating events with the new date functionality
3. **Verify Forms** - Check that all date type options appear in forms
4. **Test Validation** - Ensure proper date validation works

The polymorphic forms are already updated and ready to use these new fields!
