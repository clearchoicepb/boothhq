# Fix tenant_settings Missing from Tenant Database

## Problem Confirmed

✅ **tenant_settings EXISTS in Application DB** - Your custom opportunity stages are safe!
❌ **tenant_settings MISSING from Tenant DB** - This is causing the 500 error

**Root Cause:**
- After dual database migration, API routes query Tenant DB
- tenant_settings table was not created in Tenant DB
- Settings API → queries Tenant DB → table doesn't exist → 500 error
- Custom stages can't load → frontend falls back to hardcoded defaults
- `stage_1761253720446` not in defaults → 3 opportunities invisible

---

## Solution: Migrate tenant_settings Table

### Option 1: Automated Script (Recommended)

Run the migration script:

```bash
node scripts/migrate-tenant-settings.js
```

**What it does:**
1. ✅ Reads all settings from Application DB
2. ✅ Creates tenant_settings table in Tenant DB (prompts you to run SQL)
3. ✅ Migrates all your settings data
4. ✅ Verifies custom opportunity stages are present
5. ✅ Shows success confirmation

### Option 2: Manual Migration

**Step 1: Create the table in Tenant DB**

Run this in your **Tenant Database** SQL Editor:

```sql
-- Copy from: supabase/migrations/20251029000000_create_tenant_settings_in_tenant_db.sql
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON tenant_settings(tenant_id, setting_key);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_tenant_isolation ON tenant_settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
```

**Step 2: Copy the data**

In **Application DB**, export data:
```sql
SELECT * FROM tenant_settings
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

Download as CSV, then import into **Tenant DB** using Supabase Table Editor.

---

## Verification Steps

After migration:

### 1. Check Settings API
```bash
curl http://localhost:3000/api/settings
```

Should return 200 (not 500) with your settings data.

### 2. Check Tenant DB
Run in **Tenant DB**:
```sql
SELECT COUNT(*) as settings_count
FROM tenant_settings
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

Should return count > 0.

### 3. Check Opportunity Stages
Run in **Tenant DB**:
```sql
SELECT setting_key, setting_value
FROM tenant_settings
WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
  AND setting_key LIKE 'opportunities.stages%';
```

Should show your custom stages including `stage_1761253720446`.

### 4. Check Stuck Opportunities
Run in **Tenant DB**:
```sql
SELECT id, name, stage, amount
FROM opportunities
WHERE stage = 'stage_1761253720446'
  AND tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

Should show your 3 opportunities.

### 5. Test in UI
1. Go to Settings > Opportunities in your app
2. ✅ Your custom stages should be visible
3. ✅ No 500 errors
4. Go to Opportunities > Pipeline view
5. ✅ The 3 missing opportunities should now appear

---

## Other Missing Tables to Migrate

After fixing tenant_settings, you also need to migrate:

### Configuration Tables (Copy from App DB to Tenant DB)

**Priority: HIGH**
- `event_categories` - 3 rows (events won't work without this!)
- `event_types` - 16 rows (events won't work without this!)
- `design_statuses` - 7 rows (design module broken)
- `core_task_templates` - 5 rows (tasks broken)

**Priority: MEDIUM**
- `contracts` - 1 row (missing contract)

### Data Rows (Some records not migrated)

**Priority: MEDIUM**
- `accounts` - 3 missing rows
- `contacts` - 2 missing rows
- `contact_accounts` - 2 missing rows
- `leads` - 1 missing row

Run script to identify and migrate these:
```bash
node scripts/complete-data-migration.js  # (to be created)
```

---

## Expected Results

After fixing tenant_settings:

**Before:**
- ❌ Settings API: 500 error
- ❌ Custom opportunity stages: Lost
- ❌ 3 opportunities: Invisible in pipeline
- ❌ Settings page: Shows hardcoded defaults

**After:**
- ✅ Settings API: 200 OK
- ✅ Custom opportunity stages: Restored
- ✅ 3 opportunities: Visible in pipeline
- ✅ Settings page: Shows your customizations

---

## Timeline

1. **Immediate:** Fix tenant_settings (5-10 minutes)
2. **Next:** Migrate event_categories and event_types (5 minutes)
3. **Then:** Migrate other missing tables (15 minutes)
4. **Finally:** Verify all modules working

**Total time: ~30-40 minutes**

---

## Need Help?

If the migration script fails, check:
1. `.env.local` has correct database URLs and keys
2. Service role keys have full database access
3. Tenant DB is accessible and writable
4. RLS policies aren't blocking the migration

Run diagnostics:
```bash
node scripts/check-tenant-settings.js
```
