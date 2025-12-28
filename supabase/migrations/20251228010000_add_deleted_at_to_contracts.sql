-- Add soft delete support to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for filtering non-deleted contracts
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts(deleted_at) WHERE deleted_at IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN contracts.deleted_at IS 'Timestamp when contract was soft deleted. NULL means not deleted.';
