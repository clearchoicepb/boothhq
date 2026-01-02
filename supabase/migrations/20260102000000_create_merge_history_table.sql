-- Migration: create_merge_history_table.sql
-- Tracks all merge operations for audit purposes and potential undo functionality

CREATE TABLE IF NOT EXISTS merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- What was merged
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'account')),

  -- The record that was kept (survivor)
  survivor_id UUID NOT NULL,

  -- The record that was deleted (victim)
  victim_id UUID NOT NULL,

  -- Snapshot of both records before merge (for potential undo)
  survivor_snapshot JSONB NOT NULL,
  victim_snapshot JSONB NOT NULL,

  -- Final merged record
  merged_snapshot JSONB NOT NULL,

  -- Related data that was transferred (counts for reference)
  transferred_data JSONB DEFAULT '{}'::jsonb,

  -- Who performed the merge
  merged_by UUID,
  merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional notes about why this merge was done
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_merge_history_tenant ON merge_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_entity ON merge_history(entity_type, survivor_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_date ON merge_history(merged_at DESC);
CREATE INDEX IF NOT EXISTS idx_merge_history_victim ON merge_history(entity_type, victim_id);

-- Enable Row Level Security
ALTER TABLE merge_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's merge history"
  ON merge_history FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert merge history for their tenant"
  ON merge_history FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Add comment for documentation
COMMENT ON TABLE merge_history IS 'Tracks all contact and account merge operations for audit trail and potential undo functionality';
COMMENT ON COLUMN merge_history.survivor_id IS 'The record that was kept after the merge';
COMMENT ON COLUMN merge_history.victim_id IS 'The record that was deleted/absorbed after the merge';
COMMENT ON COLUMN merge_history.survivor_snapshot IS 'JSON snapshot of the survivor record before merge';
COMMENT ON COLUMN merge_history.victim_snapshot IS 'JSON snapshot of the victim record before deletion';
COMMENT ON COLUMN merge_history.merged_snapshot IS 'JSON snapshot of the final merged record';
COMMENT ON COLUMN merge_history.transferred_data IS 'Counts of related data transferred (events, invoices, etc.)';
