-- Migration: Remove event status column
-- Date: 2026-01-01
-- Description: Removes the legacy status field from events table as requested

-- Drop the status column from events table
ALTER TABLE events DROP COLUMN IF EXISTS status;
