-- Create task_notes table for tracking progress updates on tasks
-- These are append-only notes (no edit/delete) for audit trail purposes
-- Only supported on parent tasks, not subtasks

-- =====================================================
-- STEP 1: CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Multi-DB: References tenants in auth DB
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL, -- Multi-DB: References users in auth DB
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce 4000 character limit on content
  CONSTRAINT task_notes_content_length CHECK (char_length(content) <= 4000),

  -- Ensure content is not empty
  CONSTRAINT task_notes_content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Add table comment
COMMENT ON TABLE task_notes IS 'Progress notes/updates for tasks. Append-only for audit trail.';
COMMENT ON COLUMN task_notes.content IS 'Note content, max 4000 characters';

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX idx_task_notes_tenant_id ON task_notes(tenant_id);
CREATE INDEX idx_task_notes_author_id ON task_notes(author_id);
CREATE INDEX idx_task_notes_created_at ON task_notes(created_at);

-- Composite index for common query pattern (notes for a task in chronological order)
CREATE INDEX idx_task_notes_task_created ON task_notes(task_id, created_at ASC);

-- =====================================================
-- STEP 3: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation using JWT claims (multi-DB compatible)
CREATE POLICY task_notes_tenant_isolation ON task_notes
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Note: No UPDATE or DELETE policies needed - notes are append-only
-- The service role bypasses RLS for admin operations if needed

-- =====================================================
-- STEP 4: TRIGGER FOR updated_at
-- =====================================================

-- Note: We still have updated_at for potential future admin corrections
-- but the column will typically match created_at since notes are immutable

CREATE OR REPLACE FUNCTION update_task_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_notes_updated_at_trigger
  BEFORE UPDATE ON task_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_task_notes_updated_at();

-- =====================================================
-- STEP 5: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON task_notes TO authenticated;
GRANT SELECT, INSERT ON task_notes TO anon;

-- Service role can do everything (for admin operations)
GRANT ALL ON task_notes TO service_role;
