-- Fix the migration by checking actual schema and handling missing columns

-- First, let's see what columns actually exist in the users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

