# Investigation: Amanda's Login Issue

**Date**: 2025-11-10
**User**: amanda@clearchoicephotos.com
**Status**: Issue identified and fixed

## Problem Summary

Amanda cannot log into the system because her account exists in the **Tenant Database** but not in **Supabase Auth**.

## Root Cause Analysis

### How Authentication Works

The system uses a **dual-database architecture** with **two-stage authentication**:

1. **Stage 1 (Supabase Auth)**: Validates email/password credentials
   - Location: `src/lib/auth.ts:28-36`
   - Uses: `supabase.auth.signInWithPassword()`

2. **Stage 2 (Tenant DB)**: Retrieves user profile and permissions
   - Location: `src/lib/auth.ts:47-57`
   - Queries: `users` table in Tenant Database

**Both stages must succeed for login to work.**

### What Went Wrong

Amanda's user record was created via a **SQL seed script** (`scripts/create-and-migrate-users-to-tenant-db.sql:87`), which only created her in the Tenant Database:

```sql
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, ...)
VALUES (
  '0f64238b-5c85-4000-b4e1-680e5786ee15',
  '5f98f4c0-5254-4c61-8633-55ea049c7f18',
  'amanda@clearchoicephotos.com',
  'Amanda',
  'Smith',
  'admin',
  'active',
  NULL,  -- last_login
  ...
  NULL,  -- password_hash
  ...
);
```

**Problem**: This SQL script bypassed the normal user creation flow, which would have created both:
- ✅ Tenant DB record (created)
- ❌ Supabase Auth account (missing!)

### Evidence

**From Tenant Database**:
- ✅ User ID: `0f64238b-5c85-4000-b4e1-680e5786ee15`
- ✅ Email: `amanda@clearchoicephotos.com`
- ✅ Role: `admin`
- ✅ Status: `active`
- ❌ Last Login: `NULL` (never logged in)
- ❌ Password Hash: `NULL` (no password)

**From Supabase Auth**:
- ❌ Account does not exist

## The Solution

### Fix Script

Created: `scripts/create-amanda-auth-account.js`

This script:
1. ✅ Verifies Amanda exists in Tenant DB
2. ✅ Creates her Supabase Auth account (with temporary password)
3. ✅ Updates password hash in Tenant DB for consistency

### Running the Fix

```bash
# Make the script executable
chmod +x scripts/create-amanda-auth-account.js

# Run the script
node scripts/create-amanda-auth-account.js
```

### After Running the Script

Amanda can log in with:
- **Email**: amanda@clearchoicephotos.com
- **Password**: `TempPass2025!` (should be changed after first login)

⚠️ **Security Note**: User should change password immediately after first login.

## How to Prevent This Issue

### ✅ Correct Way to Create Users

**Option 1: Use the Admin UI** (Recommended)
1. Log in as admin
2. Navigate to Settings → Users
3. Click "Add User"
4. Fill in user details
5. System automatically creates BOTH accounts

**Option 2: Use the API**
```typescript
POST /api/users
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "First",
  "last_name": "Last",
  "role": "admin",
  "tenant_id": "5f98f4c0-5254-4c61-8633-55ea049c7f18"
}
```

This API endpoint (`src/app/api/users/route.ts:34-257`) handles:
- ✅ Creating Supabase Auth account
- ✅ Creating Tenant DB record
- ✅ Proper error handling and rollback

### ❌ Incorrect Way to Create Users

**Do NOT create users by:**
- Direct SQL INSERT into `users` table
- Database seed scripts that bypass Supabase Auth
- Manual database manipulation

## Related Files

### Authentication System
- `src/lib/auth.ts` - NextAuth configuration with two-stage auth
- `src/lib/supabase-client.ts` - Database clients
- `src/lib/tenant-helpers.ts` - Tenant context and authorization

### User Management
- `src/app/api/users/route.ts` - User CRUD API (correct way to create users)
- `src/app/[tenant]/settings/users/page.tsx` - User management UI

### Migration/Seed Scripts
- `scripts/create-and-migrate-users-to-tenant-db.sql` - Original seed (caused issue)
- `scripts/reset-admin-password.js` - Pattern for fixing auth issues
- `scripts/create-amanda-auth-account.js` - Fix for Amanda's account

## Technical Details

### Database Schema

**Tenant DB - users table**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  password_hash TEXT,  -- For consistency, but NOT used for login
  last_login TIMESTAMP WITH TIME ZONE,
  ...
  UNIQUE(tenant_id, email)
);
```

**Supabase Auth - auth.users table** (managed by Supabase):
- Stores authentication credentials
- Handles password hashing/verification
- Manages email confirmation
- Cannot be directly queried from app (use admin API)

### Authentication Flow

```
Login Request
    ↓
[1] Supabase Auth Validation (src/lib/auth.ts:28-36)
    ├─ Success → Continue
    └─ Failure → Return null (login fails)
    ↓
[2] Query Tenant DB (src/lib/auth.ts:47-57)
    ├─ User found + status='active' → Continue
    └─ User not found or inactive → Return null (login fails)
    ↓
[3] Get Tenant Info (src/lib/auth.ts:73-83)
    ├─ Tenant found + status='active' → Continue
    └─ Tenant not found or inactive → Return null (login fails)
    ↓
[4] Update Last Login (src/lib/auth.ts:86-89)
    ↓
[5] Return Session (src/lib/auth.ts:92-102)
```

## Lessons Learned

1. **Never create users directly in the database** - Always use the application API
2. **Dual-database architecture requires dual setup** - Both Supabase Auth + Tenant DB
3. **Seed scripts should use the API** - Not direct SQL inserts
4. **Test login immediately after user creation** - Catch issues early

## Other Users to Check

Based on the seed script, check these users for the same issue:

| Email | Status | Last Login | Likely Has Issue? |
|-------|--------|------------|-------------------|
| admin@default.com | active | ✅ 2025-10-03 | ❌ No (has logged in) |
| dhobrath81@gmail.com | inactive | ✅ 2025-10-07 | ❌ No (has logged in) |
| admin@clearchoicephotos.com | active | ✅ 2025-10-29 | ❌ No (has logged in) |
| operations@clearchoicephotos.com | inactive | ❌ NULL | ⚠️ Maybe (never logged in) |
| **amanda@clearchoicephotos.com** | **active** | **❌ NULL** | **✅ YES** |
| bryan@clearchoicephotos.com | active | ✅ 2025-10-27 | ❌ No (has logged in) |
| paul@clearchoicephotos.com | active | ✅ 2025-10-28 | ❌ No (has logged in) |
| Raphael@clearchoicephotos.com | active | ✅ 2025-10-22 | ❌ No (has logged in) |

**Action Item**: Check `operations@clearchoicephotos.com` as well (status is 'inactive', so it may not matter).

## Resolution Status

- ✅ Issue identified
- ✅ Fix script created
- ⏳ Pending: Run script to create Amanda's Supabase Auth account
- ⏳ Pending: Verify Amanda can log in
- ⏳ Pending: Amanda changes password after first login

---

**Next Steps**:
1. Run `node scripts/create-amanda-auth-account.js`
2. Test login with temporary password
3. Have Amanda change password
4. Update seed scripts to prevent future occurrences
