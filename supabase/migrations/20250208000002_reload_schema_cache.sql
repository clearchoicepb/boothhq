-- Reload the PostgREST schema cache to recognize the new event_staff_assignments table
-- This ensures the table is immediately available to the API
NOTIFY pgrst, 'reload schema';
