-- Migration: Fix payroll_adjustments permissions
-- This fixes "permission denied for table payroll_adjustments" error (code 42501)
--
-- Root cause: The table was created but database role grants were never set up,
-- so even the service_role cannot perform INSERT/UPDATE operations.

-- First, create the table if it doesn't exist (in case it was never created)
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Unique constraint to prevent duplicate adjustments for same user/period
  UNIQUE(tenant_id, user_id, period_start, period_end)
);

-- Disable RLS for simpler access (like other payroll tables)
ALTER TABLE payroll_adjustments DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT ALL ON payroll_adjustments TO authenticated;

-- Grant all permissions to anon role (for public API access if needed)
GRANT ALL ON payroll_adjustments TO anon;

-- Grant all permissions to service_role (should already have, but explicit)
GRANT ALL ON payroll_adjustments TO service_role;

-- Ensure sequence permissions for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_tenant_period
ON payroll_adjustments(tenant_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_user
ON payroll_adjustments(user_id);

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_payroll_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payroll_adjustments_updated_at ON payroll_adjustments;
CREATE TRIGGER trigger_payroll_adjustments_updated_at
  BEFORE UPDATE ON payroll_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_adjustments_updated_at();

-- Comment for documentation
COMMENT ON TABLE payroll_adjustments IS 'Stores payroll reimbursements and adjustments per pay period';
