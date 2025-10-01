-- Fix admin@default.com to have proper bcrypt password hash
-- Password: password123

-- Update admin@default.com with bcrypt hash for "password123"
UPDATE users
SET password_hash = '$2b$10$7Qi6IEwuUQHUep3jBz9xc.2D7A4EPUjbxzNGjgvrEE/6obd7VGgxS'
WHERE email = 'admin@default.com';

-- Verify the update
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@default.com' AND password_hash LIKE '$2a$%') THEN
        RAISE NOTICE 'Successfully updated admin@default.com with bcrypt password hash';
        RAISE NOTICE 'Login with: admin@default.com / password123';
    ELSE
        RAISE WARNING 'Failed to update admin@default.com password hash';
    END IF;
END $$;
