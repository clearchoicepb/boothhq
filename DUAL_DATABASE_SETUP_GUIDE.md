# Dual Database Setup Guide

## Overview

This guide will walk you through setting up a **professional, production-ready dual database architecture** for BootHQ. We're separating application metadata from tenant business data for enhanced security, scalability, and compliance.

**Estimated Time:** 20-30 minutes
**Downtime Required:** None (zero-downtime setup)
**Complexity:** Medium

## Architecture

```
┌─────────────────────────────────────┐
│   APPLICATION DATABASE              │
│   (Your existing Supabase project)  │
│   - tenants (metadata only)         │
│   - users (authentication)          │
│   - audit_log (system audit)        │
└─────────────────────────────────────┘
           ↓
    Tenant Routing
           ↓
┌─────────────────────────────────────┐
│   TENANT DATA DATABASE              │
│   (NEW Supabase project)            │
│   - accounts, contacts, leads       │
│   - opportunities, events           │
│   - invoices, payments, quotes      │
│   - All business data (45+ tables)  │
└─────────────────────────────────────┘
```

## Prerequisites

Before starting, ensure you have:

- [ ] Access to your existing Supabase dashboard
- [ ] Ability to create a new Supabase project
- [ ] Local development environment with Node.js
- [ ] Supabase CLI installed (optional but recommended)
- [ ] Database backup of existing data (safety measure)

## Step 1: Create Second Supabase Project

### 1.1 Create New Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New project"**
3. Select your organization
4. Configure the project:
   - **Name:** `boothhq-tenant-data` (or your preferred name)
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Same as your application database (for lower latency)
   - **Pricing Plan:** Same as your application database

5. Click **"Create new project"**
6. Wait 2-3 minutes for provisioning

### 1.2 Gather Connection Details

Once the project is created, collect these details:

1. Go to **Settings** → **API**
2. Copy and save:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Project API Keys:**
     - `anon` / `public` key
     - `service_role` key (keep this secret!)

3. Go to **Settings** → **Database**
4. Note the **Region** (e.g., `us-east-1`)

### 1.3 Save Your Credentials

Create a temporary file `tenant-db-credentials.txt` (DO NOT COMMIT):

```
TENANT_DATA_PROJECT_URL=https://xxxxx.supabase.co
TENANT_DATA_ANON_KEY=eyJhbGc...
TENANT_DATA_SERVICE_KEY=eyJhbGc... (keep secret!)
TENANT_DATA_REGION=us-east-1
```

## Step 2: Run Automated Setup

We've created scripts to automate the entire setup process.

### 2.1 Run the Setup Script

```bash
# Navigate to project root
cd /home/user/boothhq

# Make the script executable
chmod +x scripts/setup-dual-database.sh

# Run the setup (will prompt for credentials)
./scripts/setup-dual-database.sh
```

The script will:
1. ✅ Validate your credentials
2. ✅ Apply migration to application database (add connection config columns)
3. ✅ Initialize tenant data database schema (all 45+ tables)
4. ✅ Create environment variables
5. ✅ Update tenant record with connection info
6. ✅ Verify the setup

### 2.2 If You Prefer Manual Setup

If you prefer manual control, follow the manual steps in the next section.

## Step 3: Manual Setup (Alternative to Script)

### 3.1 Update Environment Variables

Copy the example file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:

```bash
# ===== APPLICATION DATABASE (Existing) =====
NEXT_PUBLIC_SUPABASE_URL=https://your-existing-app.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-existing-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-existing-service-key

# ===== TENANT DATA DATABASE (New) =====
DEFAULT_TENANT_DATA_URL=https://xxxxx.supabase.co
DEFAULT_TENANT_DATA_ANON_KEY=your-new-anon-key
DEFAULT_TENANT_DATA_SERVICE_KEY=your-new-service-key

# ===== ENCRYPTION KEY =====
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-generated-32-byte-hex-key
```

### 3.2 Apply Migration to Application Database

Using Supabase CLI:
```bash
# Connect to your application database
export SUPABASE_ACCESS_TOKEN=your-access-token
export SUPABASE_DB_URL=your-app-database-url

# Apply the migration
supabase db push
```

Or manually via SQL Editor in Supabase Dashboard:
```bash
# Copy the migration SQL
cat supabase/migrations/20251027000001_add_tenant_data_source_config.sql

# Paste and run in SQL Editor of APPLICATION database
```

### 3.3 Initialize Tenant Data Database

Using psql:
```bash
# Get the connection string from Supabase Dashboard
# Settings → Database → Connection string (postgres://...)

psql "your-tenant-data-connection-string" -f supabase/tenant-data-db-schema.sql
```

Or via SQL Editor in Supabase Dashboard:
```bash
# Copy the schema SQL
cat supabase/tenant-data-db-schema.sql

# Paste and run in SQL Editor of TENANT DATA database
```

### 3.4 Update Tenant Record

Connect to your **APPLICATION** database and run:

```sql
-- Find your default tenant
SELECT id, name, subdomain FROM tenants;

-- Update with tenant data database connection
UPDATE tenants
SET
  data_source_url = 'https://xxxxx.supabase.co',
  data_source_anon_key = 'your-anon-key',  -- TODO: Encrypt in production
  data_source_service_key = 'your-service-key',  -- TODO: Encrypt in production
  data_source_region = 'us-east-1',
  tenant_id_in_data_source = id::text
WHERE subdomain = 'default';  -- or wherever your default tenant is

-- Verify
SELECT id, name, data_source_url, data_source_region
FROM tenants
WHERE subdomain = 'default';
```

## Step 4: Migrate Existing Data (If Any)

If you have existing business data in the application database:

### 4.1 Export Tenant Data

```bash
# Run the data migration script
node scripts/migrate-tenant-data.js --tenant-id=<your-tenant-id>
```

Or manually:
```bash
# Export data from application database
pg_dump --data-only \
  --table=accounts \
  --table=contacts \
  --table=opportunities \
  --table=events \
  --table=invoices \
  --table=payments \
  "your-app-database-url" > tenant_data_export.sql

# Import to tenant data database
psql "your-tenant-data-url" -f tenant_data_export.sql
```

## Step 5: Verify Setup

### 5.1 Run Test Script

```bash
# Test the dual database setup
npm run test:dual-database

# Or manually
node scripts/test-dual-database-setup.js
```

This will verify:
- ✅ Application database connection
- ✅ Tenant data database connection
- ✅ Tenant record has valid connection info
- ✅ Can query both databases
- ✅ Tenant routing works correctly

### 5.2 Manual Verification

Test in Node.js console:

```javascript
const { getTenantClient } = require('./src/lib/data-sources');

(async () => {
  // Get tenant-specific client
  const client = await getTenantClient('your-tenant-id', true);

  // Test query
  const { data, error } = await client
    .from('accounts')
    .select('count');

  console.log('Accounts in tenant DB:', data);
  console.log('Error (should be null):', error);
})();
```

## Step 6: Test Your Application

### 6.1 Start Development Server

```bash
npm run dev
```

### 6.2 Test Key Features

1. **Login** - Ensure authentication still works
2. **View Accounts** - Check that data loads
3. **Create Account** - Verify writes work
4. **View Events** - Test different tables
5. **Create Invoice** - Test related data

### 6.3 Check for Errors

Monitor the console for any errors related to database connections.

## Step 7: Monitor and Optimize

### 7.1 Check Connection Pool Usage

```typescript
import { dataSourceManager } from '@/lib/data-sources';

const stats = dataSourceManager.getCacheStats();
console.log('Config cache:', stats.configCacheSize);
console.log('Client cache:', stats.clientCacheSize);
```

### 7.2 Test Connection Health

```bash
# Test connection to tenant database
npm run test:tenant-connection -- --tenant-id=your-tenant-id
```

## Rollback Plan (If Needed)

If you encounter issues:

### Option 1: Quick Rollback (Keep Both Databases)

Simply update the tenant record to point back to the application database temporarily:

```sql
-- APPLICATION DATABASE
UPDATE tenants
SET
  data_source_url = NULL,
  data_source_anon_key = NULL,
  data_source_service_key = NULL
WHERE id = 'your-tenant-id';
```

Your GenericRepository will fall back to the application database.

### Option 2: Full Rollback

```bash
# Restore from git
git checkout main
git branch -D claude/refactor-data-sources-011CUUaeu6zepZ7xEFmofpbf

# Restore environment
cp .env.local.backup .env.local

# Restart application
npm run dev
```

## Security Checklist

Before going to production:

- [ ] Enable RLS policies on all tenant data tables
- [ ] Implement proper encryption for connection strings
- [ ] Rotate Supabase service role keys
- [ ] Set up connection pool limits
- [ ] Enable audit logging for tenant config changes
- [ ] Configure database backups
- [ ] Set up monitoring and alerts
- [ ] Review and restrict API access
- [ ] Test with multiple tenants
- [ ] Document disaster recovery procedures

## Troubleshooting

### Issue: "Tenant has no data source configured"

**Solution:** Check that the tenant record has `data_source_url` set:
```sql
SELECT id, name, data_source_url FROM tenants WHERE id = 'your-tenant-id';
```

### Issue: "Connection failed"

**Solution:** Test connection manually:
```bash
psql "your-tenant-data-connection-string" -c "SELECT 1;"
```

### Issue: "Table doesn't exist"

**Solution:** Verify schema was applied:
```sql
-- In TENANT DATA database
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## Success Criteria

Your setup is complete when:

- ✅ Application database has tenant connection config columns
- ✅ Tenant data database has all 45+ tables
- ✅ Environment variables are configured
- ✅ Tenant record has valid connection info
- ✅ Application can read/write to both databases
- ✅ No errors in application logs
- ✅ All tests pass

## Next Steps

After successful setup:

1. **Monitor Performance** - Check query times and connection pool usage
2. **Plan for Scale** - Consider when to add more tenant data databases
3. **Implement Encryption** - Add proper connection string encryption
4. **Document** - Update team documentation
5. **Add More Tenants** - Test with additional tenants

## Support

- Documentation: `DATABASE_ARCHITECTURE.md` and `DATABASE_REFACTOR_README.md`
- Scripts: `/scripts/` directory
- Code: `/src/lib/data-sources/` directory

---

**Need Help?** Review the troubleshooting section above or check the implementation details in the documentation files.
