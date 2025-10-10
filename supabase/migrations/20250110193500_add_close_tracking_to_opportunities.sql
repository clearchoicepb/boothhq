-- Add close reason and notes tracking to opportunities table
-- This captures valuable sales intelligence when opportunities are won or lost

ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS close_reason TEXT,
ADD COLUMN IF NOT EXISTS close_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN opportunities.close_reason IS 'Reason why opportunity was won or lost (e.g., "Better Price/Value", "Lost to Competitor")';
COMMENT ON COLUMN opportunities.close_notes IS 'Additional notes about why the opportunity closed';

-- Create index for analytics queries on closed opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_close_reason
ON opportunities(close_reason)
WHERE stage IN ('closed_won', 'closed_lost');
