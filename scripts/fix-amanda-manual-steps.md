# Manual Fix for Amanda's Login Issue

Since environment variables aren't set up for the Node.js script, follow these manual steps using the **Supabase Dashboard**.

## Step 1: Create Amanda's Supabase Auth Account

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project** (Application Database)
   - URL: https://app.supabase.com/project/YOUR_PROJECT_ID

2. **Navigate to Authentication → Users**
   - Click on "Add User" or "Invite User"

3. **Create Amanda's account:**
   ```
   Email: amanda@clearchoicephotos.com
   Password: TempPass2025!
   ```

4. **Important Settings:**
   - ✅ Check "Auto Confirm User" (so she doesn't need to verify email)
   - ✅ Check "Email Confirmed" if available

5. **Click "Create User"**

---

## Step 2: Update Password Hash in Tenant Database (Optional but Recommended)

This step keeps the tenant database in sync with Supabase Auth.

### 2a. Generate Password Hash

Run this in your terminal (or use an online bcrypt generator):

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('TempPass2025!', 10, (err, hash) => console.log(hash))"
```

This will output something like:
```
$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNO
```

### 2b. Update Tenant Database

Go to your **Tenant Database** (Default Tenant Data) in Supabase Dashboard:
- Navigate to **SQL Editor**
- Run this query (replace `YOUR_HASH_HERE` with the hash from step 2a):

```sql
UPDATE users
SET
  password_hash = 'YOUR_HASH_HERE',
  updated_at = NOW()
WHERE
  email = 'amanda@clearchoicephotos.com'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

---

## Step 3: Verify Amanda's Account

### 3a. Check Supabase Auth

In Supabase Dashboard (Application Database):
- Go to **Authentication → Users**
- Search for: `amanda@clearchoicephotos.com`
- ✅ Should see her account listed
- ✅ Email should be confirmed

### 3b. Check Tenant Database

In Supabase Dashboard (Tenant Database):
- Go to **SQL Editor**
- Run this query:

```sql
SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  password_hash IS NOT NULL as has_password
FROM users
WHERE
  email = 'amanda@clearchoicephotos.com'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

Expected result:
```
id: 0f64238b-5c85-4000-b4e1-680e5786ee15
email: amanda@clearchoicephotos.com
first_name: Amanda
last_name: Smith
role: admin
status: active
has_password: true
```

---

## Step 4: Test Login

1. Go to your application login page
2. Login with:
   - **Email**: amanda@clearchoicephotos.com
   - **Password**: TempPass2025!
3. ✅ Should successfully log in
4. **First thing**: Change password to something secure!

---

## Alternative: SQL Script for Supabase SQL Editor

If you want to check/update everything via SQL, here's a complete script:

```sql
-- ============================================================================
-- FIX AMANDA'S LOGIN - RUN IN TENANT DATABASE SQL EDITOR
-- ============================================================================

-- Step 1: Check if user exists in Tenant DB
SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  password_hash,
  last_login
FROM users
WHERE
  email = 'amanda@clearchoicephotos.com'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Step 2: Update password_hash (replace with actual bcrypt hash)
-- IMPORTANT: Generate hash first using bcrypt with password 'TempPass2025!'
UPDATE users
SET
  password_hash = '$2a$10$YOUR_BCRYPT_HASH_HERE',
  updated_at = NOW()
WHERE
  email = 'amanda@clearchoicephotos.com'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

-- Step 3: Verify update
SELECT
  email,
  password_hash IS NOT NULL as has_password,
  updated_at
FROM users
WHERE
  email = 'amanda@clearchoicephotos.com'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

---

## Notes

⚠️ **Most Important Step**: Creating the Supabase Auth account (Step 1) is what fixes the login issue.

✅ **Optional but Good Practice**: Updating the password hash in Tenant DB (Step 2) keeps both databases in sync.

🔐 **Security**: Make sure Amanda changes the temporary password after first login!

---

## After Amanda Can Log In

Once this is fixed, update the seed script to prevent this issue for future users:
- File: `scripts/create-and-migrate-users-to-tenant-db.sql`
- Add a warning comment about needing to create Supabase Auth accounts
- Or better: Use the API endpoint `/api/users` instead of direct SQL inserts
