-- ============================================================================
-- Update seed_default_task_templates function to use unified task_type values
--
-- This ensures new tenants get templates with correct task_type values that
-- match the unified task types used in the UI for filtering.
--
-- Unified task types: general, design, operations, sales, admin, accounting, customer_success, project, misc
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_default_task_templates(target_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Sales templates (task_type = 'sales' for unified filtering)
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Follow Up Lead', 'Quick follow-up task for new leads', 'sales', 'sales', 'Follow up with lead', NULL, 'high', 2, 1),
    (target_tenant_id, 'Send Quote', 'Send proposal/quote to prospect', 'sales', 'sales', 'Send quote', NULL, 'high', 1, 2),
    (target_tenant_id, 'Schedule Call', 'Schedule discovery or sales call', 'sales', 'sales', 'Schedule call', NULL, 'medium', 3, 3),
    (target_tenant_id, 'Contract Review', 'Review contract before sending', 'sales', 'sales', 'Review contract', NULL, 'high', 1, 4),
    (target_tenant_id, 'Proposal Preparation', 'Prepare detailed proposal', 'sales', 'sales', 'Prepare proposal', NULL, 'high', 2, 5);

  -- Design templates (task_type = 'design' for unified filtering)
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Create Design Proof', 'Create initial design proof for client', 'design', 'design', 'Create design proof', NULL, 'high', 3, 1),
    (target_tenant_id, 'Final Approval Needed', 'Get final approval before printing', 'design', 'design', 'Get final design approval', NULL, 'urgent', 1, 2),
    (target_tenant_id, 'Create Template', 'Create new design template', 'design', 'design', 'Create design template', NULL, 'medium', 5, 3),
    (target_tenant_id, 'Artwork Revision', 'Make requested design changes', 'design', 'design', 'Revise artwork', NULL, 'medium', 2, 4);

  -- Operations templates (task_type = 'operations' for unified filtering)
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Equipment Check', 'Verify equipment is ready', 'operations', 'operations', 'Check equipment for event', NULL, 'high', 2, 1),
    (target_tenant_id, 'Assign Staff', 'Assign staff to event', 'operations', 'operations', 'Assign staff to event', NULL, 'high', 7, 2),
    (target_tenant_id, 'Logistics Planning', 'Plan event logistics and setup', 'operations', 'operations', 'Plan event logistics', NULL, 'medium', 14, 3),
    (target_tenant_id, 'Booth Setup', 'Set up booth on event day', 'operations', 'operations', 'Booth setup', NULL, 'urgent', 0, 4);

  -- Accounting templates (task_type = 'accounting' for unified filtering)
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Send Invoice', 'Send invoice to client', 'accounting', 'accounting', 'Send invoice', NULL, 'high', 1, 1),
    (target_tenant_id, 'Follow Up Payment', 'Follow up on overdue payment', 'accounting', 'accounting', 'Follow up on payment', NULL, 'high', 3, 2),
    (target_tenant_id, 'Reconcile Account', 'Reconcile account balance', 'accounting', 'accounting', 'Reconcile account', NULL, 'medium', 7, 3),
    (target_tenant_id, 'Deposit Verification', 'Verify deposit received', 'accounting', 'accounting', 'Verify deposit', NULL, 'medium', 1, 4);

  -- Customer Success templates (task_type = 'customer_success' for unified filtering)
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Send Thank You', 'Send thank you email after event', 'customer_success', 'customer_success', 'Send thank you email', NULL, 'low', 1, 1),
    (target_tenant_id, 'Request Feedback', 'Request feedback from client', 'customer_success', 'customer_success', 'Request client feedback', NULL, 'medium', 3, 2),
    (target_tenant_id, 'Onboarding Call', 'Schedule client onboarding call', 'customer_success', 'customer_success', 'Schedule onboarding call', NULL, 'high', 2, 3),
    (target_tenant_id, 'Check-in Call', 'Schedule check-in call with client', 'customer_success', 'customer_success', 'Schedule check-in call', NULL, 'medium', 7, 4);

  -- Admin templates (task_type = 'admin' for unified filtering)
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'User Onboarding', 'Onboard new team member', 'admin', 'admin', 'Onboard new user', NULL, 'medium', 2, 1),
    (target_tenant_id, 'System Maintenance', 'Perform system maintenance tasks', 'admin', 'admin', 'System maintenance', NULL, 'low', 30, 2),
    (target_tenant_id, 'Data Backup', 'Backup system data', 'admin', 'admin', 'Backup data', NULL, 'medium', 7, 3);
END;
$$ LANGUAGE plpgsql;

-- Note: This function is called when creating new tenants.
-- Existing tenants were fixed by the previous migration (20251231000001).
