-- Add event-related fields to opportunities table
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_type VARCHAR(20),  -- Removed DEFAULT to allow NULL
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS initial_date DATE,
ADD COLUMN IF NOT EXISTS final_date DATE,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Add index for lead_id
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);

-- Add constraint to ensure date_type is valid (allows NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_date_type'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT check_date_type
    CHECK (date_type IS NULL OR date_type IN ('single', 'multiple'));
  END IF;
END $$;

-- Add constraint to ensure proper date fields when date_type is set
-- This version allows NULL date_type (for opportunities without dates yet)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_date_fields'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT check_date_fields
    CHECK (
      date_type IS NULL OR  -- Allow opportunities without date_type set
      (date_type = 'single' AND initial_date IS NULL AND final_date IS NULL) OR
      (date_type = 'multiple' AND event_date IS NULL AND initial_date IS NOT NULL AND final_date IS NOT NULL AND initial_date <= final_date)
    );
  END IF;
END $$;

-- Update RLS policy to include lead_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'opportunities'
    AND policyname = 'tenant_isolation_opportunities'
  ) THEN
    CREATE POLICY tenant_isolation_opportunities ON opportunities
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN opportunities.event_type IS 'Type of event (wedding, corporate, etc.)';
COMMENT ON COLUMN opportunities.date_type IS 'Whether this is a single day or multiple day event (NULL until dates are set)';
COMMENT ON COLUMN opportunities.event_date IS 'Date for single day events';
COMMENT ON COLUMN opportunities.initial_date IS 'Start date for multiple day events';
COMMENT ON COLUMN opportunities.final_date IS 'End date for multiple day events';
COMMENT ON COLUMN opportunities.lead_id IS 'Reference to lead if opportunity was created from a lead';
