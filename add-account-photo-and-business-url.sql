-- Add photo_url and business_url fields to accounts table
-- This migration adds photo upload capability and business URL field for company accounts

-- Add photo_url column for storing account photos
ALTER TABLE accounts 
ADD COLUMN photo_url TEXT;

-- Add business_url column for company business websites
ALTER TABLE accounts 
ADD COLUMN business_url TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN accounts.photo_url IS 'URL or base64 data for account photo';
COMMENT ON COLUMN accounts.business_url IS 'Business website URL for company accounts';






