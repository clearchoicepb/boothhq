# Tenant Database Missing Tables Issue

## Problem

The dual database architecture is incomplete. Many critical tables are missing from the Tenant DB, causing:

1. **Settings API 500 Error** - `tenant_settings` table doesn't exist in Tenant DB
2. **Lost Custom Stages** - Can't read opportunity stage configuration
3. **Missing Data** - Data exists in Application DB but APIs query Tenant DB

## Architecture (Expected)

### Application DB (Shared)
- `tenants` - Tenant registry
- `users` - Global user accounts (NOT tenant-specific)
- `roles` - Global roles
- `permissions` - Global permissions
- `audit_log` - System audit trail

### Tenant DB (Isolated per tenant)
**Core Business Data:**
- `accounts`, `contacts`, `contact_accounts`
- `leads`, `opportunities`, `opportunity_line_items`
- `events`, `event_dates`, `event_staff`
- `invoices`, `invoice_line_items`
- `quotes`, `quote_line_items`
- `payments`

**Supporting Data:**
- `locations`, `tasks`, `notes`, `attachments`
- `communications`, `contracts`

**Configuration & Customization:**
- `tenant_settings` ⚠️ **CRITICAL - MISSING**
- `templates`, `packages`, `add_ons`
- `staff_roles`

**Event-Specific:**
- `event_categories`, `event_types`
- `booths`, `booth_types`, `booth_assignments`
- `equipment`, `equipment_types`, `equipment_items`, `equipment_categories`
- `design_types`, `design_statuses`

**Core Tasks:**
- `core_task_templates`, `core_tasks`

## Root Cause

The database migration in commit `2a7455e` updated API routes to use the tenant database, but **did not create all required tables** in the Tenant DB.

Result: API routes query Tenant DB → tables don't exist → 500 errors

## Diagnostic Steps

### Step 1: List tables in both databases

**Application DB:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Tenant DB:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Step 2: Identify missing tables

Compare the two lists. Tables that should be in Tenant DB but are missing.

### Step 3: Check if data exists in Application DB

For each missing table (especially `tenant_settings`):
```sql
-- In Application DB
SELECT COUNT(*) FROM tenant_settings WHERE tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18';
```

## Fix Strategy

### Option 1: Complete the Migration (Recommended)

1. **Create missing tables in Tenant DB**
   - Copy schema from Application DB
   - Include all indexes, constraints, RLS policies

2. **Migrate data for your tenant**
   - Copy all rows where `tenant_id = '5f98f4c0-5254-4c61-8633-55ea049c7f18'`
   - Verify data integrity

3. **Verify API routes**
   - Ensure all routes use `getTenantDatabaseClient()`
   - Test CRUD operations

### Option 2: Rollback Migration (If needed)

If migration is incomplete and causing production issues:

1. **Revert API routes** to use Application DB temporarily
2. **Complete the migration** in a staging environment
3. **Re-deploy** when fully tested

## Missing Tables Checklist

Run this query in **Tenant DB** to verify which critical tables exist:

```sql
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_settings')
    THEN '✅' ELSE '❌'
  END AS tenant_settings,

  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts')
    THEN '✅' ELSE '❌'
  END AS accounts,

  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts')
    THEN '✅' ELSE '❌'
  END AS contacts,

  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities')
    THEN '✅' ELSE '❌'
  END AS opportunities,

  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events')
    THEN '✅' ELSE '❌'
  END AS events;
```

## Next Steps

1. **Run diagnostic:** `node scripts/audit-tenant-db-schema.js`
2. **Review missing tables**
3. **Decide on fix strategy** (complete migration vs rollback)
4. **Execute migration script** (to be created)
5. **Verify all APIs work**
6. **Test custom opportunity stages**

## Impact

**Current State:**
- ❌ Settings API broken (500 error)
- ❌ Custom opportunity stages lost
- ❌ Unknown how many other tables are affected
- ❌ Production site may have widespread issues

**After Fix:**
- ✅ Settings API working
- ✅ Custom stages restored
- ✅ All business data accessible
- ✅ Dual database architecture complete
