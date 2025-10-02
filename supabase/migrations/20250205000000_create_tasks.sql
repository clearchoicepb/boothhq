-- Create tasks table for task management and assignment
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Related entity (can be linked to opportunity, account, contact, lead, etc.)
  entity_type VARCHAR(50), -- 'opportunity', 'account', 'contact', 'lead', 'invoice', 'event'
  entity_id UUID,

  -- Status and priority
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Dates
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation_tasks ON tasks
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE tasks IS 'Task management and assignment system';
COMMENT ON COLUMN tasks.title IS 'Short task title/summary';
COMMENT ON COLUMN tasks.description IS 'Detailed task description';
COMMENT ON COLUMN tasks.assigned_to IS 'User the task is assigned to';
COMMENT ON COLUMN tasks.created_by IS 'User who created the task';
COMMENT ON COLUMN tasks.entity_type IS 'Type of entity this task is related to';
COMMENT ON COLUMN tasks.entity_id IS 'ID of the related entity';
COMMENT ON COLUMN tasks.status IS 'Current status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN tasks.due_date IS 'When the task is due';
COMMENT ON COLUMN tasks.completed_at IS 'When the task was completed';
