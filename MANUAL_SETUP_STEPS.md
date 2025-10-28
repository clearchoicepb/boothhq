# Manual Setup Steps for Dual Database Configuration

Follow these steps **exactly** and verify each one before moving to the next. This will ensure we avoid the issues from yesterday.

## ✅ COMPLETED STEPS

- [x] Created `.env.local` with both database configurations
- [x] Generated encryption key and NextAuth secret
- [x] Installed npm dependencies

## 📝 STEP 1: Apply Migration to Application Database

### 1.1 Open Supabase SQL Editor

1. Go to: https://djeeircaeqdvfgkczrwx.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### 1.2 Copy and Paste this SQL

Open the file: `supabase/migrations/20251027000001_add_tenant_data_source_config.sql`

OR copy this complete SQL:

```sql
-- Migration: Add data source configuration to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS data_source_url TEXT,
  ADD COLUMN IF NOT EXISTS data_source_anon_key TEXT,
  ADD COLUMN IF NOT EXISTS data_source_service_key TEXT,
  ADD COLUMN IF NOT EXISTS data_source_region TEXT,
  ADD COLUMN IF NOT EXISTS connection_pool_config JSONB DEFAULT '{"min": 2, "max": 10}'::jsonb,
  ADD COLUMN IF NOT EXISTS data_source_notes TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id_in_data_source TEXT;

-- Add comments
COMMENT ON COLUMN tenants.data_source_url IS 'Supabase URL for tenant data database';
COMMENT ON COLUMN tenants.data_source_anon_key IS 'Anon key for tenant data database';
COMMENT ON COLUMN tenants.data_source_service_key IS 'Service role key for tenant data database';
COMMENT ON COLUMN tenants.data_source_region IS 'Database region (e.g., us-east-1)';
COMMENT ON COLUMN tenants.connection_pool_config IS 'Connection pool configuration';
COMMENT ON COLUMN tenants.data_source_notes IS 'Notes about data source configuration';
COMMENT ON COLUMN tenants.tenant_id_in_data_source IS 'Tenant ID used in the tenant data database';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_data_source_url
  ON tenants(data_source_url)
  WHERE data_source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_region
  ON tenants(data_source_region)
  WHERE data_source_region IS NOT NULL;

-- Add constraint
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS check_data_source_complete;

ALTER TABLE tenants
  ADD CONSTRAINT check_data_source_complete
  CHECK (
    (data_source_url IS NULL AND data_source_anon_key IS NULL AND data_source_service_key IS NULL)
    OR
    (data_source_url IS NOT NULL AND data_source_anon_key IS NOT NULL AND data_source_service_key IS NOT NULL)
  );
```

### 1.3 Click "RUN"

### 1.4 VERIFY - Run this query:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN (
    'data_source_url',
    'data_source_anon_key',
    'data_source_service_key',
    'data_source_region',
    'connection_pool_config',
    'tenant_id_in_data_source'
  )
ORDER BY column_name;
```

**Expected Result:** Should show 6 rows with all the column names.

✅ **Mark as done only if you see all 6 columns!**

---

## 📝 STEP 2: Apply Schema to Tenant Data Database

### 2.1 Open Tenant Data Supabase SQL Editor

1. Go to: https://swytdziswfndllwosbsd.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### 2.2 Copy and Paste the ENTIRE Schema

Open the file: `supabase/tenant-data-db-schema.sql` (1056 lines)

**IMPORTANT:** This is a LARGE file. Copy ALL 1056 lines.

You can use this command to display it:
```bash
cat supabase/tenant-data-db-schema.sql
```

### 2.3 Click "RUN"

This will take 10-30 seconds. You should see a success message with:
```
Tables created: 45+
RLS policies: Enabled on all tables
```

### 2.4 VERIFY - Run this query:

```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%';
```

**Expected Result:** Should show at least 40 tables.

### 2.5 VERIFY Key Tables - Run this query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts', 'contacts', 'leads', 'opportunities',
    'events', 'invoices', 'payments', 'quotes',
    'tasks', 'contracts', 'locations', 'attachments'
  )
ORDER BY table_name;
```

**Expected Result:** Should show all 12 table names.

✅ **Mark as done only if both verification queries pass!**

---

## 📝 STEP 3: Get Tenant ID

### 3.1 Go back to APPLICATION Database SQL Editor

Go to: https://djeeircaeqdvfgkczrwx.supabase.co (SQL Editor)

### 3.2 Run this query:

```sql
SELECT id, name, subdomain, created_at
FROM tenants
ORDER BY created_at
LIMIT 5;
```

### 3.3 Copy the Tenant ID

Copy the `id` value (UUID format) of your main tenant.

**Example:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Write it down here:** ___________________________________

---

## 📝 STEP 4: Update Tenant Record

### 4.1 Still in APPLICATION Database SQL Editor

### 4.2 Run this UPDATE query (replace YOUR_TENANT_ID):

```sql
UPDATE tenants
SET
  data_source_url = 'https://swytdziswfndllwosbsd.supabase.co',
  data_source_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXRkemlzd2ZuZGxsd29zYnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTI4OTksImV4cCI6MjA3NzE2ODg5OX0.vNlPpAV58Fc6KdfrDMgqkfXqRc4KCmKpi4qpYyvijLs',
  data_source_service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXRkemlzd2ZuZGxsd29zYnNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5Mjg5OSwiZXhwIjoyMDc3MTY4ODk5fQ.tAextEekTKBjuKplcaTu0bN2UIv5GBMKIutnF3Y-_F0',
  data_source_region = 'us-east-1',
  tenant_id_in_data_source = 'YOUR_TENANT_ID',
  connection_pool_config = '{"min": 2, "max": 10}'::jsonb
WHERE id = 'YOUR_TENANT_ID';
```

**IMPORTANT:** Replace `YOUR_TENANT_ID` with the actual UUID from Step 3.3 (appears TWICE in the query).

### 4.3 VERIFY - Run this query (replace YOUR_TENANT_ID):

```sql
SELECT
  id,
  name,
  subdomain,
  data_source_url,
  data_source_region,
  tenant_id_in_data_source,
  CASE
    WHEN data_source_anon_key IS NOT NULL THEN '✓ SET'
    ELSE '✗ MISSING'
  END as anon_key_status,
  CASE
    WHEN data_source_service_key IS NOT NULL THEN '✓ SET'
    ELSE '✗ MISSING'
  END as service_key_status
FROM tenants
WHERE id = 'YOUR_TENANT_ID';
```

**Expected Result:**
- `data_source_url` should be: `https://swytdziswfndllwosbsd.supabase.co`
- `data_source_region` should be: `us-east-1`
- `tenant_id_in_data_source` should match your tenant ID
- `anon_key_status` should be: `✓ SET`
- `service_key_status` should be: `✓ SET`

✅ **Mark as done only if ALL fields are correct!**

---

## 📝 STEP 5: Run Verification Script

Now run our automated verification script:

```bash
npm run test:dual-database
```

OR if that doesn't work:

```bash
npx ts-node scripts/test-dual-database-setup.ts
```

**Expected Result:** All tests should pass (100% pass rate).

If any tests fail, **STOP** and let me know which tests failed.

---

## 📝 STEP 6: Ready for Testing

Once all steps are verified, come back and we'll:
1. Test creating records
2. Test querying records
3. Verify data isolation
4. Commit and push

---

## 🆘 If You Get Stuck

If any step fails:
1. Take a screenshot of the error
2. Tell me which step number failed
3. Copy the exact error message
4. We'll debug together

---

**When you're ready, start with STEP 1 and let me know after each step is verified!**
