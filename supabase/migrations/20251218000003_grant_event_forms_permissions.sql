-- ============================================
-- Grant permissions for event forms tables
-- Required for Supabase client access
-- ============================================

-- event_form_templates permissions
GRANT ALL ON event_form_templates TO service_role;
GRANT ALL ON event_form_templates TO authenticated;
GRANT SELECT ON event_form_templates TO anon;

-- event_forms permissions
GRANT ALL ON event_forms TO service_role;
GRANT ALL ON event_forms TO authenticated;
GRANT ALL ON event_forms TO anon;  -- anon needs INSERT/UPDATE for public form submission
