-- ============================================
-- Add proof_name column to design_proofs table
-- ============================================
--
-- This column stores a client-facing name for the design proof
-- (e.g., "Photo Strip Design", "Microsite Layout", "Welcome Screen")
-- ============================================

ALTER TABLE design_proofs
ADD COLUMN IF NOT EXISTS proof_name VARCHAR(255);

-- Update existing records to use file_name as default proof_name
UPDATE design_proofs
SET proof_name = file_name
WHERE proof_name IS NULL;

-- Add comment
COMMENT ON COLUMN design_proofs.proof_name IS 'Client-facing name describing what they are approving';
