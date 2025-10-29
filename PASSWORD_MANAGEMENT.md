# Password Management Guide

## Overview

The authentication system uses **Supabase Auth** for login. For proper authentication, users must exist in **BOTH** places:

1. **Supabase Auth** - For login authentication (source of truth for passwords)
2. **users table** - For app data (roles, permissions, profile info)

## ✅ What Works Automatically

### Creating New Users
When you create a new user through the app (Settings → Users → Add User), it **automatically**:
- ✅ Creates user in Supabase Auth with the password
- ✅ Creates user record in users table
- ✅ Rolls back if either fails

**No manual intervention needed!**

---

## 🔧 Password Changes

### For Users to Change Their Own Password

Users can change their password by making a POST request to:

```
POST /api/users/{userId}/password
Content-Type: application/json

{
  "password": "newPassword123",
  "currentPassword": "oldPassword123"
}
```

**Requirements:**
- Must be logged in
- `currentPassword` is required for security
- `password` must be at least 8 characters

### For Admins to Reset User Passwords

Admins can reset any user's password without knowing the current password:

```
POST /api/users/{userId}/password
Content-Type: application/json

{
  "password": "newPassword123"
}
```

**Requirements:**
- Must have admin role
- No `currentPassword` needed

---

## 🚨 Troubleshooting: Reset Admin Password

If you can't log in as `admin@default.com`, run:

```bash
node scripts/reset-admin-password.js
```

This script:
- Creates/updates user in Supabase Auth
- Sets password to `password123`
- Updates password_hash in users table
- Verifies user exists with correct permissions

**Default credentials after reset:**
- Email: `admin@default.com`
- Password: `password123`

---

## 🔐 Security Best Practices

1. **Change Default Password**: After initial setup, change the admin password immediately
2. **Strong Passwords**: Enforce 8+ character minimum, but recommend 12+ characters
3. **Regular Updates**: Users should change passwords periodically
4. **No Shared Accounts**: Each user should have their own account

---

## 📝 Implementation Notes

### Why Two Places?

- **Supabase Auth**: Handles authentication, password hashing, session management
- **users table**: Stores business data (role, permissions, profile, tenant association)

Both are needed because:
- Supabase Auth is the secure, battle-tested authentication layer
- users table is where we store app-specific data and tenant relationships

### Password Hash in users table

The `password_hash` in the users table is **optional** and kept for consistency. The source of truth is **always Supabase Auth**.

If the users table update fails but Supabase Auth succeeds, authentication will still work.

---

## 🎯 Quick Reference

| Operation | Creates in Supabase Auth? | Creates in users table? | Notes |
|-----------|--------------------------|------------------------|-------|
| **New User** (via Settings UI) | ✅ Yes | ✅ Yes | Automatic |
| **Change Password** (via API) | ✅ Yes | ✅ Yes | Use `/api/users/{id}/password` |
| **Reset Password** (script) | ✅ Yes | ✅ Yes | Run `node scripts/reset-admin-password.js` |
| **Update User Profile** | ❌ No | ✅ Yes | Name, role, phone, etc. |

---

## 🔮 Future Improvements

To add password change to the Settings UI:

1. Add a "Change Password" section to Settings → Profile
2. Call `POST /api/users/{currentUserId}/password` with form data
3. Show success/error messages
4. Require current password for non-admins

Example implementation needed in:
- `src/app/[tenant]/settings/profile/page.tsx` (user changes own password)
- `src/app/[tenant]/settings/users/page.tsx` (admin resets user password)

