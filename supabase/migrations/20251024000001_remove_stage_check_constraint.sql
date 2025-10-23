-- ═══════════════════════════════════════════════════════════════
-- ENABLE CUSTOM OPPORTUNITY STAGES
-- 
-- GOAL: Allow tenants to define custom stages in settings
-- CHANGE: Remove CHECK constraint on opportunities.stage column
-- WHY: CHECK constraint limits stages to 6 hardcoded values
-- IMPACT: Enables full stage customization per tenant
-- ═══════════════════════════════════════════════════════════════

-- Remove the CHECK constraint that limits stage values
ALTER TABLE opportunities
DROP CONSTRAINT IF EXISTS opportunities_stage_check;

-- Add documentation
COMMENT ON COLUMN opportunities.stage IS 
'Opportunity stage - values defined per-tenant in tenant_settings.opportunities.stages. Application validates against configured stages.';

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- Run this to confirm constraint is removed
-- ═══════════════════════════════════════════════════════════════

/*
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'opportunities'::regclass
  AND conname LIKE '%stage%';

-- Should return NO rows with stage CHECK constraint
-- If it returns rows, the constraint still exists
*/

-- ═══════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════

-- BEFORE THIS MIGRATION:
-- - Only 6 stages allowed: prospecting, qualification, proposal, negotiation, closed_won, closed_lost
-- - Database enforces this list with CHECK constraint
-- - Tenants cannot add custom stages

-- AFTER THIS MIGRATION:
-- - Any string value allowed for stage column
-- - Tenant settings define available stages
-- - Application validates against settings
-- - Each tenant can have custom stages

-- BACKWARDS COMPATIBILITY:
-- - Existing opportunities unchanged (still have valid stage values)
-- - Existing functionality preserved
-- - Default stages still work
-- - No data migration needed

-- SAFETY:
-- - Forms only show stages configured in settings (dropdown)
-- - Cannot freeform type stage value
-- - Application-level validation ensures data quality
-- - Multi-tenant isolation via tenant_settings

-- ROLLBACK (if needed):
-- If you need to restore the constraint, you would run:
-- ALTER TABLE opportunities
-- ADD CONSTRAINT opportunities_stage_check
-- CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'));
-- 
-- WARNING: Rollback will FAIL if any custom stages exist in database
-- You would need to migrate custom stages back to standard stages first

