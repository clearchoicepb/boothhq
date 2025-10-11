-- Add owner assignment to opportunities for accountability and territory management
-- Every opportunity should have an assigned owner (the person responsible for closing it)

ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN opportunities.owner_id IS 'The user responsible for closing this opportunity (references auth.users.id)';

-- Create index for filtering by owner
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id
ON opportunities(owner_id)
WHERE owner_id IS NOT NULL;

-- Create index for common query pattern (tenant + owner)
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_owner
ON opportunities(tenant_id, owner_id)
WHERE owner_id IS NOT NULL;

-- Set default owner_id for new records to the creating user (if available from session)
-- Note: This will be handled in application code for better control
