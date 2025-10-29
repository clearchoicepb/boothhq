# 🧹 Database Cleanup Guide

**Problem:** You have data in BOTH databases right now
**Solution:** Sync new data, then clean up the duplicate

---

## 📊 Current Situation

```
Application Database (OLD)              Tenant Database (NEW)
├── 13 accounts (original) ────────────> ├── 13 accounts (migrated) ✅
├── 9 contacts (original)  ────────────> ├── 9 contacts (migrated) ✅
├── 49 opportunities       ────────────> ├── 49 opportunities ✅
├── ...                                  ├── ...
│                                        │
└── + NEW data (created after migration) │
    ├── 1+ new accounts ────────────────> NEED TO COPY ⚠️
    ├── New contacts?                     │
    └── New opportunities?                │
```

**Result:** Duplicates + confusion! Need to consolidate.

---

## 🎯 The Plan

### Phase 1: Sync New Data (Safe)
Find any NEW records created in application DB after the migration and copy them to tenant DB.

### Phase 2: Clean Up (Optional but Recommended)
Delete all business data from application DB so there's no confusion.

---

## 🚀 Step-by-Step Instructions

### Prerequisites

On your **LOCAL PC**:

```bash
# 1. Pull latest changes
git pull origin claude/session-011CUaPeMSzR7wCHWRie12k2

# 2. Make sure .env.local has both database credentials
# (it should from earlier setup)
```

### Run the Sync & Cleanup Script

```bash
# Navigate to your project
cd /path/to/boothhq

# Run the script
node scripts/sync-and-cleanup-databases.js
```

---

## 📋 What the Script Does

### Step 1: Compare Data

The script will show you a comparison:

```
📊 Comparing Data Counts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓  accounts              App:  14 | Tenant:  13 | Diff: +1
✓  contacts              App:   9 | Tenant:   9 | Diff:  0
✓  opportunities         App:  49 | Tenant:  49 | Diff:  0
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Summary:
   Tables checked: 20
   Tables with new data in app DB: 1
   Total new records: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What this means:**
- **Diff: 0** = Same count in both (already synced)
- **Diff: +1** = 1 more record in app DB (needs migration)
- **Diff: -1** = More in tenant DB (unusual, check manually)

### Step 2: Migrate New Data

The script will ask:

```
⚠️  Found new data in application DB:
   • accounts: 1 new record(s)

❓ Do you want to migrate this new data to tenant DB? (yes/no):
```

**Type `yes`** to migrate the new data to tenant DB.

Expected output:
```
📊 Migrating New Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Migrating accounts... (1 new records)
  ✓ Migrated 1 new records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Migration Summary:
   Total records migrated: 1
   Errors: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Clean Up Application DB (OPTIONAL)

The script will ask:

```
🧹 Cleanup Application Database (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  WARNING: This will DELETE all business data from application DB!
This includes ALL records in these tables:
   • accounts, contacts, leads, opportunities
   • events, invoices, quotes, contracts
   • tasks, notes, attachments, communications

✅ SAFE: This will NOT delete:
   • tenants (application metadata)
   • users (authentication)
   • audit_log (system logs)

💡 Why clean up?
   • Avoid confusion (data in 2 places)
   • Properly use dual-database architecture
   • All business data should be in tenant DB only

❓ Do you want to DELETE business data from application DB? (yes/no):
```

**My Recommendation: Type `yes`**

This will clean up the duplicates and leave your architecture clean:
- Application DB: Only tenants, users, audit_log ✅
- Tenant DB: All business data ✅

Expected output:
```
📊 Cleaning up application database...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deleting accounts...
  ✓ Deleted 14 records

Deleting contacts...
  ✓ Deleted 9 records

Deleting opportunities...
  ✓ Deleted 49 records

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Cleanup Summary:
   Total records deleted: 253
   Errors: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Application database cleanup complete!

📊 Final Summary:
   Records migrated: 1
   Records deleted from app DB: 253

🎉 Done!
```

---

## ✅ Verification

After running the script, verify everything works:

### 1. Check Database Counts

**Application DB** (https://djeeircaeqdvfgkczrwx.supabase.co):
```sql
-- Should be 0 (cleaned up)
SELECT COUNT(*) FROM accounts;

-- Should still work (application metadata)
SELECT COUNT(*) FROM tenants;  -- Should be 1
SELECT COUNT(*) FROM users;     -- Should have your users
```

**Tenant DB** (https://swytdziswfndllwosbsd.supabase.co):
```sql
-- Should have all your data
SELECT COUNT(*) FROM accounts;       -- Should be 14 (or whatever your total is)
SELECT COUNT(*) FROM contacts;       -- Should be 9
SELECT COUNT(*) FROM opportunities;  -- Should be 49
```

### 2. Test Your Application

```bash
# Start dev server
npm run dev

# Test these pages:
http://localhost:3000/accounts
http://localhost:3000/contacts
http://localhost:3000/opportunities
http://localhost:3000/events
```

**Expected:** All your data should show up correctly! ✅

### 3. Create New Test Data

Create a new account in your app, then check:

```sql
-- In Tenant DB (https://swytdziswfndllwosbsd.supabase.co)
SELECT * FROM accounts ORDER BY created_at DESC LIMIT 1;
-- Should show your new account! ✅

-- In Application DB (https://djeeircaeqdvfgkczrwx.supabase.co)
SELECT COUNT(*) FROM accounts;
-- Should still be 0! ✅
```

---

## 🚨 If Something Goes Wrong

### Don't Panic!

Your data is safe:
- Original data was copied to tenant DB during migration
- New data will be copied before cleanup
- Script asks for confirmation before deleting anything

### Backup Option

If you want to be extra safe, create a backup first:

```bash
# Backup application DB (before cleanup)
# Go to Supabase Dashboard → Database → Backups → Create Backup
```

### Undo Cleanup

If you accidentally clean up and want to restore:

1. The migration copied everything to tenant DB (it's safe there)
2. You can re-run the original migration script in reverse if needed
3. Or restore from Supabase backup

---

## 🎯 Decision Tree

Not sure what to do? Follow this:

```
Do you have NEW data in app DB (created after migration)?
│
├─ YES → Run the script
│         ├─ Step 1: Compare (see what's different)
│         ├─ Step 2: Migrate new data to tenant DB
│         └─ Step 3: Clean up app DB (recommended)
│
└─ NO → Just clean up
        └─ Run the script and choose "no" to migration,
           "yes" to cleanup
```

---

## 📊 Before & After

### Before Running Script

```
Application DB                    Tenant DB
├── 13 OLD accounts              ├── 13 accounts
├── 1 NEW account                ├── 9 contacts
├── 9 OLD contacts               ├── 49 opportunities
├── 49 OLD opportunities         └── ... (253 records)
└── ... (254 records)

Problem: Data in BOTH places! ❌
```

### After Running Script

```
Application DB                    Tenant DB
├── tenants ✅                   ├── 14 accounts (OLD + NEW)
├── users ✅                     ├── 9 contacts
├── audit_log ✅                 ├── 49 opportunities
└── (No business data)            └── ... (254 records)

Result: Clean architecture! ✅
```

---

## 💡 Why Clean Up?

### Benefits

1. **No Confusion:** Data only in one place
2. **Proper Architecture:** Application DB for metadata, Tenant DB for business data
3. **Easier Maintenance:** Clear separation of concerns
4. **Better Performance:** Smaller application DB
5. **Future-Proof:** Ready for multiple tenants with separate databases

### Risks of NOT Cleaning Up

1. ❌ Confusion about which data is "real"
2. ❌ Accidentally querying old data
3. ❌ Wasting space with duplicates
4. ❌ Not truly using dual-database architecture
5. ❌ Harder to add more tenants later

---

## 🚀 Next Steps

After cleanup:

1. ✅ Test your application thoroughly
2. ✅ Create new test data and verify it goes to tenant DB
3. ✅ Check debug endpoint: `/api/debug/tenant-connection`
4. ✅ Deploy to production when confident
5. ✅ Monitor for any issues

---

## 📝 Script Details

### What It Checks

The script compares these 20 tables:
- accounts, contacts, contact_accounts
- leads, opportunities, opportunity_line_items
- locations, events, event_dates
- invoices, invoice_line_items, payments
- quotes, quote_line_items, contracts
- tasks, notes, attachments, communications, templates

### What It DOESN'T Touch

The script will never modify:
- ✅ tenants (stays in application DB)
- ✅ users (stays in application DB)
- ✅ audit_log (stays in application DB)
- ✅ Any tables not in the business data list

### Safe to Run Multiple Times

The script uses:
- `UPSERT` for migrations (won't create duplicates)
- Confirmation prompts before destructive operations
- Detailed reporting at each step

---

## ❓ FAQ

### Q: Will this delete my users?
**A:** No! User data stays in application DB.

### Q: Will this delete my tenant configuration?
**A:** No! Tenant metadata stays in application DB.

### Q: What if I created data in BOTH databases?
**A:** The script finds records by ID. If the same ID exists in both, it skips (assumes already synced).

### Q: Can I run this in production?
**A:** Yes, but test in dev first! Take a backup before running in production.

### Q: What if the script fails halfway?
**A:** The script processes one table at a time. If it fails, you can re-run it (it uses UPSERT, so it's safe).

---

## 📞 Need Help?

If you run into issues:

1. Check the script output for error messages
2. Verify your `.env.local` has correct credentials
3. Check Supabase dashboard for connection issues
4. Review the `DUAL_DATABASE_FIX_COMPLETE.md` guide

---

**Ready to clean up?** Run the script and follow the prompts! 🚀

```bash
node scripts/sync-and-cleanup-databases.js
```
