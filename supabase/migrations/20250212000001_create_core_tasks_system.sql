-- Create core_task_templates table for tenant-customizable checklist items
CREATE TABLE IF NOT EXISTS core_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task details
  task_name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique order per tenant
  UNIQUE(tenant_id, display_order)
);

-- Create event_core_task_completion table to track which tasks are completed per event
CREATE TABLE IF NOT EXISTS event_core_task_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  core_task_template_id UUID NOT NULL REFERENCES core_task_templates(id) ON DELETE CASCADE,

  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one completion record per event per task
  UNIQUE(event_id, core_task_template_id)
);

-- Create indexes for performance
CREATE INDEX idx_core_task_templates_tenant_id ON core_task_templates(tenant_id);
CREATE INDEX idx_core_task_templates_display_order ON core_task_templates(tenant_id, display_order);
CREATE INDEX idx_event_core_task_completion_event_id ON event_core_task_completion(event_id);
CREATE INDEX idx_event_core_task_completion_tenant_id ON event_core_task_completion(tenant_id);

-- Disable RLS (we're using NextAuth, not Supabase Auth)
ALTER TABLE core_task_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_core_task_completion DISABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_core_task_templates_updated_at
  BEFORE UPDATE ON core_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_core_task_completion_updated_at
  BEFORE UPDATE ON event_core_task_completion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE core_task_templates IS 'Tenant-customizable core task checklist templates for events';
COMMENT ON TABLE event_core_task_completion IS 'Tracks completion status of core tasks per event';

-- Insert default core tasks for all existing tenants
DO $$
DECLARE
  tenant_record RECORD;
  default_tasks TEXT[] := ARRAY[
    'Photo Strip Design Approval',
    'Event Staff Assigned',
    'Event Logistics Received',
    'Event Setup in Software',
    'Payment Received'
  ];
  task_name TEXT;
  task_order INTEGER;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    task_order := 0;
    FOREACH task_name IN ARRAY default_tasks LOOP
      INSERT INTO core_task_templates (tenant_id, task_name, display_order)
      VALUES (tenant_record.id, task_name, task_order)
      ON CONFLICT (tenant_id, display_order) DO NOTHING;
      task_order := task_order + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Default core tasks created for all tenants';
END $$;

-- Create function to automatically initialize core task completions for new events
CREATE OR REPLACE FUNCTION initialize_event_core_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert completion records for all active core tasks for this tenant
  INSERT INTO event_core_task_completion (tenant_id, event_id, core_task_template_id, is_completed)
  SELECT NEW.tenant_id, NEW.id, id, false
  FROM core_task_templates
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize core tasks when an event is created
CREATE TRIGGER trigger_initialize_event_core_tasks
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION initialize_event_core_tasks();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
