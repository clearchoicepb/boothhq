-- Refresh Supabase schema cache to recognize all existing columns
NOTIFY pgrst, 'reload schema';
