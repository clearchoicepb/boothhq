-- Refresh Supabase schema cache to fix "Could not find the 'body' column" error
-- This notifies PostgREST to reload its schema cache

NOTIFY pgrst, 'reload schema';

-- Also ensure the communications table has the correct structure
DO $$
BEGIN
    -- Verify notes column exists (not body)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'communications'
        AND column_name = 'notes'
    ) THEN
        RAISE EXCEPTION 'Communications table is missing notes column';
    END IF;

    -- Verify body column does NOT exist
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'communications'
        AND column_name = 'body'
    ) THEN
        RAISE EXCEPTION 'Communications table should not have body column - only notes';
    END IF;

    RAISE NOTICE 'Communications schema verified successfully';
END $$;
