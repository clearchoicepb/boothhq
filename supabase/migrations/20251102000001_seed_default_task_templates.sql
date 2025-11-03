-- Function to seed default task templates for a tenant
-- This provides a helpful starting point for new tenants

CREATE OR REPLACE FUNCTION seed_default_task_templates(target_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Sales templates
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Follow Up Lead', 'Quick follow-up task for new leads', 'sales', 'follow_up_lead', 'Follow up with lead', NULL, 'high', 2, 1),
    (target_tenant_id, 'Send Quote', 'Send proposal/quote to prospect', 'sales', 'send_quote', 'Send quote', NULL, 'high', 1, 2),
    (target_tenant_id, 'Schedule Call', 'Schedule discovery or sales call', 'sales', 'schedule_call', 'Schedule call', NULL, 'medium', 3, 3),
    (target_tenant_id, 'Contract Review', 'Review contract before sending', 'sales', 'contract_review', 'Review contract', NULL, 'high', 1, 4),
    (target_tenant_id, 'Proposal Preparation', 'Prepare detailed proposal', 'sales', 'proposal_preparation', 'Prepare proposal', NULL, 'high', 2, 5);

  -- Design templates
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Create Design Proof', 'Create initial design proof for client', 'design', 'design_proof', 'Create design proof', NULL, 'high', 3, 1),
    (target_tenant_id, 'Final Approval Needed', 'Get final approval before printing', 'design', 'final_approval', 'Get final design approval', NULL, 'urgent', 1, 2),
    (target_tenant_id, 'Create Template', 'Create new design template', 'design', 'create_template', 'Create design template', NULL, 'medium', 5, 3),
    (target_tenant_id, 'Artwork Revision', 'Make requested design changes', 'design', 'artwork_revision', 'Revise artwork', NULL, 'medium', 2, 4);

  -- Operations templates
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Equipment Check', 'Verify equipment is ready', 'operations', 'equipment_check', 'Check equipment for event', NULL, 'high', 2, 1),
    (target_tenant_id, 'Assign Staff', 'Assign staff to event', 'operations', 'staff_assignment', 'Assign staff to event', NULL, 'high', 7, 2),
    (target_tenant_id, 'Logistics Planning', 'Plan event logistics and setup', 'operations', 'logistics_planning', 'Plan event logistics', NULL, 'medium', 14, 3),
    (target_tenant_id, 'Booth Setup', 'Set up booth on event day', 'operations', 'booth_setup', 'Booth setup', NULL, 'urgent', 0, 4);

  -- Accounting templates
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Send Invoice', 'Send invoice to client', 'accounting', 'send_invoice', 'Send invoice', NULL, 'high', 1, 1),
    (target_tenant_id, 'Follow Up Payment', 'Follow up on overdue payment', 'accounting', 'payment_follow_up', 'Follow up on payment', NULL, 'high', 3, 2),
    (target_tenant_id, 'Reconcile Account', 'Reconcile account balance', 'accounting', 'reconcile_account', 'Reconcile account', NULL, 'medium', 7, 3),
    (target_tenant_id, 'Deposit Verification', 'Verify deposit received', 'accounting', 'deposit_verification', 'Verify deposit', NULL, 'medium', 1, 4);

  -- Customer Success templates
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'Send Thank You', 'Send thank you email after event', 'customer_success', 'send_thank_you', 'Send thank you email', NULL, 'low', 1, 1),
    (target_tenant_id, 'Request Feedback', 'Request feedback from client', 'customer_success', 'request_feedback', 'Request client feedback', NULL, 'medium', 3, 2),
    (target_tenant_id, 'Onboarding Call', 'Schedule client onboarding call', 'customer_success', 'onboarding_call', 'Schedule onboarding call', NULL, 'high', 2, 3),
    (target_tenant_id, 'Check-in Call', 'Schedule check-in call with client', 'customer_success', 'check_in_call', 'Schedule check-in call', NULL, 'medium', 7, 4);

  -- Admin templates
  INSERT INTO task_templates (tenant_id, name, description, department, task_type, default_title, default_description, default_priority, default_due_in_days, display_order)
  VALUES
    (target_tenant_id, 'User Onboarding', 'Onboard new team member', 'admin', 'user_onboarding', 'Onboard new user', NULL, 'medium', 2, 1),
    (target_tenant_id, 'System Maintenance', 'Perform system maintenance tasks', 'admin', 'system_maintenance', 'System maintenance', NULL, 'low', 30, 2),
    (target_tenant_id, 'Data Backup', 'Backup system data', 'admin', 'data_backup', 'Backup data', NULL, 'medium', 7, 3);
END;
$$ LANGUAGE plpgsql;

-- Optionally seed default templates for existing tenants
-- Uncomment and run manually if you want to add default templates to existing tenants:
-- SELECT seed_default_task_templates('[your-tenant-id-here]');

-- For production, you might want to seed templates when a new tenant is created
-- This can be called from your tenant creation logic
