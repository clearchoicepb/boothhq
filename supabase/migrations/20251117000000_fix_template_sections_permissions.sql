-- Fix template_sections permissions for service role access
-- The issue: RLS policies are blocking even service role queries
-- Solution: Create a function that service role can execute with SECURITY DEFINER

-- Create a function to get template sections (bypasses RLS)
CREATE OR REPLACE FUNCTION get_template_sections_for_tenant(
  p_tenant_id UUID,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  category TEXT,
  content TEXT,
  description TEXT,
  is_system BOOLEAN,
  is_required BOOLEAN,
  merge_fields TEXT[],
  sort_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function owner
AS $$
BEGIN
  -- Return system sections (tenant_id IS NULL or is_system = true)
  -- AND tenant-specific sections
  RETURN QUERY
  SELECT 
    ts.id,
    ts.tenant_id,
    ts.name,
    ts.category,
    ts.content,
    ts.description,
    ts.is_system,
    ts.is_required,
    ts.merge_fields,
    ts.sort_order,
    ts.created_at,
    ts.updated_at,
    ts.created_by
  FROM template_sections ts
  WHERE 
    (ts.tenant_id IS NULL OR ts.tenant_id = p_tenant_id OR ts.is_system = true)
    AND (p_category IS NULL OR ts.category = p_category)
  ORDER BY ts.sort_order ASC;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_template_sections_for_tenant(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_sections_for_tenant(UUID, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_template_sections_for_tenant IS 'Fetch template sections for a tenant, including system sections. Bypasses RLS using SECURITY DEFINER.';

