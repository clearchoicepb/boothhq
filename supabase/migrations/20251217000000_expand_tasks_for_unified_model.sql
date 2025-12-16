-- ============================================================================
-- PHASE 1A: Expand tasks table to support all task types
-- This is ADDITIVE ONLY - no breaking changes
--
-- Supports unified task management for: general, design, operations, sales,
-- admin, project, and misc task types.
-- ============================================================================

-- Add new columns to tasks table for unified task model
ALTER TABLE tasks
    -- Task categorization (task_type column already exists from 20251101000000)
    ADD COLUMN IF NOT EXISTS task_template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,

    -- Design-specific fields (used when task_type = 'design')
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS design_file_urls TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS proof_file_urls TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS final_file_urls TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS client_notes TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,

    -- Approval workflow fields
    ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS approval_notes TEXT,
    ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,

    -- Timeline tracking
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS design_deadline DATE,
    ADD COLUMN IF NOT EXISTS design_start_date DATE,

    -- Product linkage (for design items linked to products)
    ADD COLUMN IF NOT EXISTS product_id UUID,

    -- Legacy tracking (to identify migrated records)
    ADD COLUMN IF NOT EXISTS migrated_from_table TEXT,
    ADD COLUMN IF NOT EXISTS migrated_from_id UUID;

-- Add foreign key constraint for approved_by after column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tasks_approved_by_fkey'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT tasks_approved_by_fkey
            FOREIGN KEY (approved_by)
            REFERENCES users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for task_type filtering (critical for dashboard performance)
-- Note: idx_tasks_task_type may already exist from prior migration
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_task_type ON tasks(tenant_id, task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_entity_task_type ON tasks(entity_type, entity_id, task_type);

-- Add index for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_tasks_requires_approval ON tasks(requires_approval) WHERE requires_approval = true;
CREATE INDEX IF NOT EXISTS idx_tasks_submitted_approval ON tasks(submitted_for_approval_at) WHERE submitted_for_approval_at IS NOT NULL;

-- Add index for task_template_id lookups
CREATE INDEX IF NOT EXISTS idx_tasks_task_template_id ON tasks(task_template_id) WHERE task_template_id IS NOT NULL;

-- Add index for migrated records tracking
CREATE INDEX IF NOT EXISTS idx_tasks_migrated_from ON tasks(migrated_from_table, migrated_from_id)
    WHERE migrated_from_table IS NOT NULL;

-- Add comments to document the fields
COMMENT ON COLUMN tasks.task_template_id IS 'Optional link to task template this was created from';
COMMENT ON COLUMN tasks.quantity IS 'Quantity for design tasks (default 1)';
COMMENT ON COLUMN tasks.revision_count IS 'Number of times design was sent back for revisions';
COMMENT ON COLUMN tasks.design_file_urls IS 'Working design files (PSD, AI, etc)';
COMMENT ON COLUMN tasks.proof_file_urls IS 'Client proofs and mockups';
COMMENT ON COLUMN tasks.final_file_urls IS 'Print-ready or final delivery files';
COMMENT ON COLUMN tasks.client_notes IS 'Notes visible to/from client';
COMMENT ON COLUMN tasks.internal_notes IS 'Internal team notes';
COMMENT ON COLUMN tasks.requires_approval IS 'Whether this task requires approval before completion';
COMMENT ON COLUMN tasks.approved_by IS 'User who approved the task';
COMMENT ON COLUMN tasks.approval_notes IS 'Notes from approval/rejection';
COMMENT ON COLUMN tasks.submitted_for_approval_at IS 'When task was submitted for approval';
COMMENT ON COLUMN tasks.approved_at IS 'When task was approved';
COMMENT ON COLUMN tasks.assigned_at IS 'When task was assigned to current assignee';
COMMENT ON COLUMN tasks.started_at IS 'When work actually started on the task';
COMMENT ON COLUMN tasks.design_deadline IS 'Deadline specifically for design work';
COMMENT ON COLUMN tasks.design_start_date IS 'Planned start date for design work';
COMMENT ON COLUMN tasks.product_id IS 'Optional link to product for design items';
COMMENT ON COLUMN tasks.migrated_from_table IS 'If migrated, source table name (event_design_items or event_operations_items)';
COMMENT ON COLUMN tasks.migrated_from_id IS 'If migrated, original record ID for reference';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
