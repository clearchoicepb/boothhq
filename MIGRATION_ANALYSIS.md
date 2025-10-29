# Database Migration Analysis

## 🚨 CRITICAL ISSUE: tenant_settings Table Missing

**The `tenant_settings` table does NOT appear in either database!**

This explains:
- ✅ Settings API 500 error
- ✅ Lost custom opportunity stages
- ✅ Unable to load any application settings

**Action Required:** Find where tenant_settings table went or recreate it.

---

## 📊 Data Migration Status

### ❌ Incomplete Data Migration (Lost Rows)

These tables have FEWER rows in Tenant DB than Application DB:

| Table | App DB | Tenant DB | Missing |
|-------|--------|-----------|---------|
| accounts | 14 | 11 | **3 rows** |
| contacts | 9 | 7 | **2 rows** |
| contact_accounts | 7 | 5 | **2 rows** |
| leads | 51 | 50 | **1 row** |

**Impact:** Some data was lost or not migrated properly!

---

## ⚠️ Configuration Tables Not Migrated

These tables exist in App DB but are empty in Tenant DB:

| Table | App DB Rows | Tenant DB Rows | Status |
|-------|-------------|----------------|--------|
| event_categories | 3 | 0 | ❌ Not migrated |
| event_types | 16 | 0 | ❌ Not migrated |
| design_statuses | 7 | 0 | ❌ Not migrated |
| core_task_templates | 5 | 0 | ❌ Not migrated |
| contracts | 1 | 0 | ❌ Not migrated |

**Impact:** Events module will break without event_categories and event_types!

---

## ✅ Correct Architecture (Should Stay in App DB Only)

These tables are correctly EMPTY in Tenant DB (they're global/shared):

- `users` - 8 rows in App DB (global user accounts)
- `tenants` - 1 row in App DB (tenant registry)
- `audit_log` - 42,648 rows in App DB (system audit trail)

**These should NOT be migrated to Tenant DB.**

---

## 🔍 Where is tenant_settings?

**Possibilities:**

### 1. Table was deleted during migration
Check migration scripts for DROP statements:
```bash
grep -r "DROP TABLE.*tenant_settings" supabase/migrations/
```

### 2. Table is named differently
Common variations:
- `settings`
- `tenant_config`
- `app_settings`
- `configuration`

Check App DB for similar tables:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%setting%'
ORDER BY table_name;
```

### 3. Settings stored in different format
Check if settings are in:
- JSONB column in `tenants` table
- Separate database/schema
- Environment variables

---

## 🛠️ Recovery Plan

### Priority 1: Find tenant_settings (URGENT)

**Option A: Check if renamed**
```sql
-- In Application DB
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%setting%' OR table_name LIKE '%config%')
ORDER BY table_name;
```

**Option B: Check tenants table for settings**
```sql
-- In Application DB
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND (column_name LIKE '%setting%' OR column_name LIKE '%config%');
```

**Option C: Search migration history**
```bash
git log --all --grep="tenant_settings" --oneline
git log --all -S"tenant_settings" --oneline
```

### Priority 2: Migrate Missing Data

Once tenant_settings is found/created:

1. **Complete the data migration** (accounts, contacts, contact_accounts, leads)
2. **Migrate configuration tables** (event_categories, event_types, design_statuses)
3. **Migrate tenant_settings** (including your custom opportunity stages)

### Priority 3: Verify Event Module

Event categories and types are critical:
- 3 event categories need to be migrated
- 16 event types need to be migrated
- 7 design statuses need to be migrated

---

## 📋 Immediate Actions

1. **Run this in Application DB:**
```sql
-- Find any settings-related tables
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (table_name LIKE '%setting%'
    OR table_name LIKE '%config%'
    OR table_name LIKE '%preferences%')
ORDER BY table_name;
```

2. **Check tenants table structure:**
```sql
-- See if settings are stored as JSONB in tenants table
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
```

3. **Search codebase for tenant_settings references:**
```bash
grep -r "tenant_settings" src/
```

---

## 🔴 Risk Assessment

**CRITICAL RISKS:**
- ❌ Settings API broken (500 error)
- ❌ Custom opportunity stages lost
- ❌ Event module likely broken (no categories/types)
- ❌ Missing rows indicate incomplete migration

**MODERATE RISKS:**
- ⚠️ Design features broken (no design_statuses)
- ⚠️ Core tasks not working (no templates)
- ⚠️ Contract missing (1 row not migrated)

**LOW RISKS:**
- ✅ Core CRM mostly working (opportunities, events working with some data)

---

## Next Steps

1. Run SQL queries above to find tenant_settings
2. Report findings
3. Create migration script to restore missing data
4. Test settings API
5. Verify custom opportunity stages work

**The tenant_settings table is THE blocker for everything else.**
