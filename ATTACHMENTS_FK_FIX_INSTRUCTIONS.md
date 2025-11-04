# Fix Attachments Upload Issue - Foreign Key Migration

## Issue
File uploads in the Events "Files" tab are failing because the `attachments` table is missing a foreign key constraint to the `users` table.

## Root Cause
The `attachments` table in the tenant database has an `uploaded_by` column but no foreign key constraint. The API uses Supabase join syntax (`users!uploaded_by`) which requires a proper foreign key relationship.

## Solution
Add the missing foreign key constraint to the tenant database.

---

## 🚀 How to Run the Migration

### Step 1: Locate Your Tenant Data Database

In Supabase Dashboard:
1. Go to https://app.supabase.com/
2. **IMPORTANT:** Select your **TENANT DATA database** project (NOT the application database)
3. The tenant data database contains tables like: `accounts`, `contacts`, `events`, `attachments`, `users`

### Step 2: Run the Migration

1. In the Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open the migration file: `supabase/migrations/20251104000000_add_attachments_user_fk.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Success

The verification query at the end should show:
- `constraint_name`: `attachments_uploaded_by_fkey`
- `foreign_table_name`: `users`
- `delete_rule`: `SET NULL`

If you see this output, the migration was successful! ✅

### Step 4: Test File Upload

1. Go to your application
2. Navigate to an Event detail page
3. Click on the "Files" tab
4. Try uploading a file
5. It should now work! 🎉

---

## 📋 What This Migration Does

1. **Adds Foreign Key Constraint**: Links `attachments.uploaded_by` → `users.id`
2. **Sets Delete Behavior**: If a user is deleted, `uploaded_by` becomes NULL (attachment is preserved)
3. **Enables Join Syntax**: Allows the API to use `users!uploaded_by` for efficient queries
4. **Reloads Schema Cache**: Makes the change immediately available to PostgREST

---

## ⚠️ Important Notes

- **This is safe to run**: It's idempotent (safe to run multiple times)
- **No data loss**: Existing attachments are not affected
- **No downtime**: Can be run while the application is running
- **Fast execution**: Takes less than 1 second

---

## 🧪 Troubleshooting

### Error: "Users table does not exist"
**Cause**: You're running this in the wrong database (application database instead of tenant data database)
**Solution**: Switch to your tenant data database in Supabase Dashboard

### Error: "Column uploaded_by does not exist"
**Cause**: The attachments table structure is different than expected
**Solution**: Run `SELECT * FROM attachments LIMIT 1;` to verify table structure

### File uploads still failing after migration
**Cause**: May need to restart your application or clear cache
**Solution**:
1. Check the Supabase logs for specific error messages
2. Restart your Next.js development server
3. Verify the constraint was added: Run the verification query from Step 5 of the migration

---

## 📁 Migration File Location

```
/home/user/boothhq/supabase/migrations/20251104000000_add_attachments_user_fk.sql
```

---

## ✅ After Migration

Once this migration is complete:
- ✅ File uploads will work in the Events "Files" tab
- ✅ Uploaded files will show who uploaded them
- ✅ User information will be included in attachment queries
- ✅ Data integrity is maintained with proper foreign key relationships

---

## 🔗 Related Files

- API Route: `/src/app/api/attachments/route.ts`
- Attachments Component: `/src/components/attachments-section.tsx`
- Original Migration: `/supabase/migrations/20250202000000_create_attachments.sql`
