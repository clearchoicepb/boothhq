-- ═══════════════════════════════════════════════════════════════
-- SET OPPORTUNITY OWNER
-- Assigns all unowned opportunities to Bryan Santos
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Find Bryan Santos
-- Run this first to verify the user exists and get the ID

SELECT 
    id,
    first_name,
    last_name,
    email,
    tenant_id
FROM users
WHERE first_name ILIKE '%Bryan%' 
  AND last_name ILIKE '%Santos%';

-- Copy the ID from the result above
-- Expected result: One row with Bryan's user ID


-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Preview what will be updated
-- Shows opportunities that will be changed (before updating)
-- ═══════════════════════════════════════════════════════════════

SELECT 
    id,
    name,
    stage,
    amount,
    created_at,
    owner_id
FROM opportunities
WHERE owner_id IS NULL
ORDER BY created_at DESC;

-- Review this list - these are the opportunities that will be updated


-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Count how many will be updated
-- ═══════════════════════════════════════════════════════════════

SELECT COUNT(*) as unowned_opportunities
FROM opportunities
WHERE owner_id IS NULL;


-- ═══════════════════════════════════════════════════════════════
-- STEP 4: PERFORM THE UPDATE
-- **IMPORTANT: Replace {BRYAN_ID} with the actual ID from Step 1**
-- ═══════════════════════════════════════════════════════════════

-- UNCOMMENT THE LINES BELOW AND REPLACE {BRYAN_ID}:

/*
UPDATE opportunities
SET owner_id = '{BRYAN_ID}',  -- ← REPLACE {BRYAN_ID} with actual UUID
    updated_at = NOW()
WHERE owner_id IS NULL;
*/

-- Example (if Bryan's ID was abc-123-def):
-- UPDATE opportunities
-- SET owner_id = 'abc-123-def',
--     updated_at = NOW()
-- WHERE owner_id IS NULL;


-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Verify the update
-- Run this after Step 4 to confirm all opportunities have owners
-- ═══════════════════════════════════════════════════════════════

-- Check for any remaining unowned opportunities (should be 0)
SELECT COUNT(*) as remaining_unowned
FROM opportunities
WHERE owner_id IS NULL;

-- Show ownership distribution
SELECT 
    u.first_name,
    u.last_name,
    u.email,
    COUNT(o.id) as opportunity_count,
    SUM(o.amount) as total_value
FROM users u
LEFT JOIN opportunities o ON u.id = o.owner_id
WHERE u.tenant_id = (SELECT tenant_id FROM users WHERE first_name ILIKE '%Bryan%' LIMIT 1)
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY opportunity_count DESC;


-- ═══════════════════════════════════════════════════════════════
-- ALTERNATIVE: If Bryan Santos doesn't exist yet
-- Create the user first, then assign opportunities
-- ═══════════════════════════════════════════════════════════════

/*
-- Insert Bryan Santos as a user (if needed)
INSERT INTO users (
    tenant_id,
    email,
    first_name,
    last_name,
    role,
    status
) VALUES (
    '{YOUR_TENANT_ID}',  -- ← Replace with your tenant_id
    'bryan.santos@yourdomain.com',  -- ← Replace with actual email
    'Bryan',
    'Santos',
    'manager',
    'active'
)
RETURNING id;

-- Then use the returned ID in the UPDATE statement above
*/


-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK (if something goes wrong)
-- ═══════════════════════════════════════════════════════════════

/*
-- To undo the changes (set all back to NULL):
UPDATE opportunities
SET owner_id = NULL,
    updated_at = NOW()
WHERE owner_id = '{BRYAN_ID}';
*/


-- ═══════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════

-- Run steps in order:
-- 1. Find Bryan Santos (get ID)
-- 2. Preview opportunities to be updated
-- 3. Count opportunities
-- 4. Update opportunities (UNCOMMENT and replace {BRYAN_ID})
-- 5. Verify update worked

-- After this:
-- ✅ All opportunities have owners
-- ✅ New opportunities auto-assign to creator (API handles this)
-- ✅ Dashboard shows owner avatars for all opportunities

