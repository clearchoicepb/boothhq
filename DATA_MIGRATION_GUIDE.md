# Data Migration Guide

## Overview

This guide will help you migrate your existing data from the APPLICATION database to the TENANT DATA database.

**Current Data to Migrate:**
- ✅ 13 accounts
- ✅ 9 contacts
- ✅ 49 opportunities
- ✅ 6 events
- ✅ Related data (contact-account relationships, opportunity line items, event dates, etc.)

---

## 🚀 Quick Start (Automated Migration)

The easiest way is to use our automated migration script:

### Step 1: Run the Migration Script

On your **local PC**, in your project root, run:

```bash
node scripts/migrate-tenant-data.js
```

### What This Does:

The script will:
1. ✅ Connect to both databases using your `.env.local` credentials
2. ✅ Fetch all data from the APPLICATION database for your tenant
3. ✅ Copy it to the TENANT DATA database in the correct order
4. ✅ Handle foreign key dependencies automatically
5. ✅ Show you a detailed progress report
6. ✅ Verify all migrations succeeded

### Expected Output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Tenant Data Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tenant ID: 5f98f4c0-5254-4c61-8633-55ea049c7f18
Application DB: https://djeeircaeqdvfgkczrwx.supabase.co
Tenant Data DB: https://swytdziswfndllwosbsd.supabase.co

📊 Step 1: Migrating Accounts...
Migrating accounts... (13 records)
  ✓ Successfully migrated 13 records

📊 Step 2: Migrating Contacts...
Migrating contacts... (9 records)
  ✓ Successfully migrated 9 records

📊 Step 3: Migrating Contact-Account Relationships...
Migrating contact_accounts... (X records)
  ✓ Successfully migrated X records

📊 Step 4: Migrating Leads...
Migrating leads... (X records)
  ✓ Successfully migrated X records

📊 Step 5: Migrating Opportunities...
Migrating opportunities... (49 records)
  ✓ Successfully migrated 49 records

... etc ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Records Migrated: XX
Tables Processed: X
Successful: X
Failed: 0

🎉 Migration completed successfully!

Next steps:
  1. Verify the migrated data in the tenant database
  2. Update the tenant record to point to the new database
  3. Test the application
```

---

## ✅ Step 2: Verify the Migration

After the migration completes, **verify** the data was copied correctly.

### In TENANT DATA Database (https://swytdziswfndllwosbsd.supabase.co):

Run this query:

```sql
SELECT
  'accounts' as table_name,
  COUNT(*) as record_count
FROM accounts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
UNION ALL
SELECT 'contacts', COUNT(*)
FROM contacts
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
UNION ALL
SELECT 'events', COUNT(*)
FROM events
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
UNION ALL
SELECT 'opportunities', COUNT(*)
FROM opportunities
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

**Expected Result:**
- accounts: 13
- contacts: 9
- events: 6
- opportunities: 49

✅ If these match, your migration was successful!

---

## 📝 Step 3: Update Tenant Record

Now that your data is safely in the TENANT DATA database, update the tenant record to point to it.

**In APPLICATION Database** (https://djeeircaeqdvfgkczrwx.supabase.co):

```sql
UPDATE tenants
SET
  data_source_url = 'https://swytdziswfndllwosbsd.supabase.co',
  data_source_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXRkemlzd2ZuZGxsd29zYnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTI4OTksImV4cCI6MjA3NzE2ODg5OX0.vNlPpAV58Fc6KdfrDMgqkfXqRc4KCmKpi4qpYyvijLs',
  data_source_service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXRkemlzd2ZuZGxsd29zYnNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5Mjg5OSwiZXhwIjoyMDc3MTY4ODk5fQ.tAextEekTKBjuKplcaTu0bN2UIv5GBMKIutnF3Y-_F0',
  data_source_region = 'us-east-1',
  tenant_id_in_data_source = '5f98f4c0-5254-4c61-8633-55ea049c7f18',
  connection_pool_config = '{"min": 2, "max": 10}'::jsonb
WHERE id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

---

## 🧪 Step 4: Run Verification Tests

```bash
npm run test:dual-database
```

This will verify:
- ✅ Both databases are accessible
- ✅ Tenant record is configured correctly
- ✅ Data routing works
- ✅ Can query the tenant data

---

## 🎯 Success Criteria

Your migration is complete when:
- ✅ Migration script shows "Migration completed successfully!"
- ✅ Verification query shows correct record counts
- ✅ Tenant record UPDATE returns "UPDATE 1"
- ✅ Test script shows 100% pass rate

---

## 🆘 Troubleshooting

### Issue: "Module not found"

**Solution:** Make sure you've run `npm install` in your project root.

### Issue: "Connection failed"

**Solution:** Check your `.env.local` file has all the tenant database credentials.

### Issue: "Some tables failed to migrate"

**Solution:** The script will show which tables failed. Common causes:
- Foreign key constraint violations (usually means data order issue)
- RLS policies blocking access (use service role keys)

### Issue: "Record counts don't match"

**Solution:**
1. Check if there were any errors in the migration output
2. Re-run the migration script (it uses `upsert`, so it's safe to run multiple times)

---

## 📌 Important Notes

- ✅ **The original data is NOT deleted** - it stays in the APPLICATION database
- ✅ **The script is safe to run multiple times** - it uses upsert (insert or update)
- ✅ **Foreign keys are preserved** - UUIDs are copied exactly
- ✅ **Your app won't use the new database until you update the tenant record** in Step 3

---

## 🔄 Need to Rollback?

If something goes wrong, you can easily rollback:

```sql
-- In APPLICATION DATABASE
UPDATE tenants
SET
  data_source_url = NULL,
  data_source_anon_key = NULL,
  data_source_service_key = NULL,
  data_source_region = NULL,
  tenant_id_in_data_source = NULL
WHERE id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

This will make your app use the APPLICATION database again (your original data).

---

**Ready to migrate? Run: `node scripts/migrate-tenant-data.js`** 🚀
