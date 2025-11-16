-- Fix RLS policies for template_sections to work with application-layer tenant context

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tenant sections and system sections" ON template_sections;
DROP POLICY IF EXISTS "Users can insert their tenant sections" ON template_sections;
DROP POLICY IF EXISTS "Users can update their tenant sections" ON template_sections;
DROP POLICY IF EXISTS "Users can delete their tenant sections" ON template_sections;

-- Recreate policies with TRUE parameter to make current_setting optional
-- This allows the API to work when the setting is not configured

CREATE POLICY "Users can view their tenant sections and system sections"
  ON template_sections FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    OR is_system = true
    OR tenant_id IS NULL
  );

CREATE POLICY "Users can insert their tenant sections"
  ON template_sections FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can update their tenant sections"
  ON template_sections FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY "Users can delete their tenant sections"
  ON template_sections FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
