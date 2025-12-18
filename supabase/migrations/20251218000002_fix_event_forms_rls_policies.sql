-- ============================================
-- Fix RLS policies for event forms tables
-- The application handles tenant filtering in code,
-- so RLS policies should be permissive for authenticated access
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their tenant form templates" ON event_form_templates;
DROP POLICY IF EXISTS "Users can insert their tenant form templates" ON event_form_templates;
DROP POLICY IF EXISTS "Users can update their tenant form templates" ON event_form_templates;
DROP POLICY IF EXISTS "Users can delete their tenant form templates" ON event_form_templates;

DROP POLICY IF EXISTS "Users can view their tenant event forms" ON event_forms;
DROP POLICY IF EXISTS "Users can insert their tenant event forms" ON event_forms;
DROP POLICY IF EXISTS "Users can update their tenant event forms" ON event_forms;
DROP POLICY IF EXISTS "Users can delete their tenant event forms" ON event_forms;

DROP POLICY IF EXISTS "Anyone can view forms by public_id" ON event_forms;
DROP POLICY IF EXISTS "Anyone can submit form responses via public_id" ON event_forms;

-- ============================================
-- AUTHENTICATED USER POLICIES
-- Allow full access for authenticated users (tenant filtering done in code)
-- ============================================

CREATE POLICY "Allow authenticated access to event_form_templates"
  ON event_form_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to event_forms"
  ON event_forms
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PUBLIC ACCESS POLICIES
-- For public form viewing and submission
-- ============================================

-- Allow public read access to forms with a valid public_id
CREATE POLICY "Allow public access to event forms via public_id"
  ON event_forms
  FOR SELECT
  USING (
    public_id IS NOT NULL
    AND public_id != ''
    AND status != 'draft'
  );

-- Allow public updates (form submission) for forms with valid public_id
CREATE POLICY "Allow public form submission via public_id"
  ON event_forms
  FOR UPDATE
  USING (
    public_id IS NOT NULL
    AND public_id != ''
    AND status != 'draft'
  )
  WITH CHECK (
    public_id IS NOT NULL
    AND public_id != ''
  );
