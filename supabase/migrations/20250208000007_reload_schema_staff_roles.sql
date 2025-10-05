-- Reload PostgREST schema cache to recognize the staff_roles foreign key
NOTIFY pgrst, 'reload schema';
