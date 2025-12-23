-- Add foreign key constraint for task_notes.author_id to users table
-- This enables Supabase to join with users for author information

ALTER TABLE task_notes
  ADD CONSTRAINT task_notes_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
