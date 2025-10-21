-- Relax the check_date_fields constraint for opportunities
-- Opportunities are early-stage and often don't have precise dates yet
-- Location and time are also optional at this stage

-- Drop the old strict constraint
ALTER TABLE opportunities 
DROP CONSTRAINT IF EXISTS check_date_fields;

-- Add a more flexible constraint
-- Allow opportunities to have:
-- 1. Just expected_close_date (most common - for sales tracking)
-- 2. Just event_date (single day event planned)
-- 3. Just initial_date and final_date (multi-day event planned)
-- 4. Any combination of the above
-- 5. None at all (very early stage)

ALTER TABLE opportunities
ADD CONSTRAINT check_date_fields CHECK (
  -- Allow any combination or none
  -- The only rule: if date_type is 'multiple', initial_date must be <= final_date (if both exist)
  date_type IS NULL 
  OR date_type = 'single'
  OR (date_type = 'multiple' AND (
    initial_date IS NULL 
    OR final_date IS NULL 
    OR initial_date <= final_date
  ))
);

-- Add comment explaining the flexible constraint
COMMENT ON CONSTRAINT check_date_fields ON opportunities IS 
  'Flexible date constraint: allows opportunities at any stage. Multi-day events only require initial_date <= final_date when both are provided.';

