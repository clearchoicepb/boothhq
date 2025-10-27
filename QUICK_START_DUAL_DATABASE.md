# Quick Start: Dual Database Setup

This is a **streamlined guide** to get your dual database architecture up and running in under 30 minutes.

## What We're Doing

We're separating your database into two:
1. **Application Database** (existing) - Stores only: tenants, users, audit_log
2. **Tenant Data Database** (new) - Stores all business data: accounts, contacts, events, invoices, etc.

**Benefits:** Better security, scalability, and compliance.

## Prerequisites Checklist

- [ ] Access to Supabase dashboard
- [ ] Can create new Supabase project
- [ ] Node.js installed locally
- [ ] This codebase running locally

**Estimated Time:** 20-30 minutes

---

## Step 1: Create New Supabase Project (5 minutes)

### 1.1 Go to Supabase Dashboard

👉 https://app.supabase.com/

### 1.2 Click "New Project"

Configure:
- **Name:** `boothhq-tenant-data`
- **Database Password:** (strong password - save it!)
- **Region:** **Same as your existing project** (important!)
- **Plan:** Same tier as your existing project

### 1.3 Wait for Provisioning

Takes 2-3 minutes. Get coffee ☕

### 1.4 Copy Your Credentials

Once ready, go to **Settings** → **API** and copy:

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGc...
service_role key: eyJhbGc... (KEEP SECRET!)
```

Also note the **Region** from **Settings** → **Database**.

---

## Step 2: Run Database Migrations (10 minutes)

### 2.1 Application Database Migration

This adds columns to store tenant connection info.

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your **existing** Supabase project dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Copy the contents of: `supabase/migrations/20251027000001_add_tenant_data_source_config.sql`
5. Paste and click **Run**
6. You should see success message

**Option B: Via Command Line**

```bash
# Get your application database connection string from Supabase Settings → Database
psql "your-application-database-connection-string" \
  -f supabase/migrations/20251027000001_add_tenant_data_source_config.sql
```

### 2.2 Tenant Data Database Schema

This creates all business tables in the new database.

**Via Supabase Dashboard (Recommended)**

1. Go to your **NEW** Supabase project dashboard (boothhq-tenant-data)
2. Click **SQL Editor**
3. Click **New Query**
4. Copy the contents of: `supabase/tenant-data-db-schema.sql`
5. Paste and click **Run**
6. This will create 45+ tables (takes ~30 seconds)
7. You should see "Tenant Data Database Schema Created!" message

---

## Step 3: Configure Environment (5 minutes)

### 3.1 Create .env.local

```bash
# If you already have .env.local, back it up first
cp .env.local .env.local.backup

# Create new .env.local from example
cp .env.example .env.local
```

### 3.2 Edit .env.local

Open `.env.local` and fill in:

```bash
# ===== APPLICATION DATABASE (Existing) =====
NEXT_PUBLIC_SUPABASE_URL=https://your-existing-app.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-existing-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-existing-service-key

# ===== TENANT DATA DATABASE (New) =====
DEFAULT_TENANT_DATA_URL=https://your-new-tenant-data.supabase.co
DEFAULT_TENANT_DATA_ANON_KEY=your-new-anon-key
DEFAULT_TENANT_DATA_SERVICE_KEY=your-new-service-key

# ===== ENCRYPTION KEY =====
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-generated-key-here
```

### 3.3 Generate Encryption Key

```bash
openssl rand -hex 32
```

Copy the output and paste it as `ENCRYPTION_KEY` in `.env.local`.

---

## Step 4: Update Tenant Record (5 minutes)

### 4.1 Find Your Tenant ID

Run this SQL in your **Application Database** SQL Editor:

```sql
SELECT id, name, subdomain FROM tenants;
```

Copy the `id` (it's a UUID).

### 4.2 Update Tenant Record

Run this SQL in your **Application Database** SQL Editor:

Replace the placeholders with your actual values:

```sql
UPDATE tenants
SET
  data_source_url = 'https://your-tenant-data.supabase.co',
  data_source_anon_key = 'your-tenant-data-anon-key',
  data_source_service_key = 'your-tenant-data-service-key',
  data_source_region = 'us-east-1',  -- or your region
  tenant_id_in_data_source = 'your-tenant-id-from-step-4.1',
  connection_pool_config = '{"min": 2, "max": 10}'::jsonb
WHERE id = 'your-tenant-id-from-step-4.1';

-- Verify
SELECT
  id,
  name,
  data_source_url,
  data_source_region,
  tenant_id_in_data_source
FROM tenants
WHERE id = 'your-tenant-id-from-step-4.1';
```

You should see the updated tenant record with all connection info filled in.

---

## Step 5: Test Everything (5 minutes)

### 5.1 Run Automated Tests

```bash
npm run db:test
```

This will verify:
- ✅ Environment variables are set
- ✅ Application database connection works
- ✅ Tenant data database connection works
- ✅ Tenant record has valid configuration
- ✅ Both databases have correct schema

### 5.2 Start Your Application

```bash
npm run dev
```

### 5.3 Test in Browser

1. Go to http://localhost:3000
2. Login
3. Try viewing/creating:
   - Accounts
   - Contacts
   - Events
   - Invoices

If everything works, you're done! 🎉

---

## Optional: Migrate Existing Data

If you have existing data in your application database:

```bash
npm run db:migrate-data -- --tenant-id=your-tenant-id
```

This will:
- Copy all business data from application DB → tenant data DB
- Preserve existing data (no overwrites)
- Provide progress report

---

## Troubleshooting

### ❌ "Tenant has no data source configured"

**Fix:** Verify Step 4.2 was completed correctly. Check the tenant record:

```sql
SELECT data_source_url FROM tenants WHERE id = 'your-tenant-id';
```

### ❌ "Failed to connect to tenant data database"

**Fix:** Check your credentials in `.env.local`. Test connection manually:

```bash
# Try accessing the database
curl -H "apikey: YOUR_ANON_KEY" "YOUR_TENANT_DATA_URL/rest/v1/"
```

### ❌ "Table doesn't exist"

**Fix:** Ensure Step 2.2 was completed. Check tables exist:

```sql
-- In TENANT DATA database
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see 45+ tables.

### ❌ Tests fail

**Fix:** Run the test script with verbose output:

```bash
npm run db:test
```

Check which specific test is failing and follow the error message.

---

## Success Checklist

Your setup is complete when:

- ✅ New Supabase project created
- ✅ Application database migration applied (adds connection columns)
- ✅ Tenant data database schema initialized (45+ tables)
- ✅ .env.local configured with both database credentials
- ✅ Tenant record updated with connection info
- ✅ All tests pass (`npm run db:test`)
- ✅ Application runs without errors
- ✅ Can view/create data through UI

---

## What Just Happened?

1. **Application Database** now only stores:
   - `tenants` (with connection info to tenant databases)
   - `users` (authentication)
   - `audit_log` (system audit trail)

2. **Tenant Data Database** now stores all business data:
   - Accounts, Contacts, Leads, Opportunities
   - Events, Locations, Staff
   - Invoices, Payments, Quotes
   - Tasks, Contracts, Templates
   - And 35+ more tables

3. Your application automatically routes queries to the correct database based on the tenant.

---

## Next Steps

### Security Hardening (Before Production)

1. **Encrypt connection strings** - Currently stored in plain text
2. **Rotate database keys** - Use Supabase key rotation
3. **Enable RLS policies** - Already enabled, but verify
4. **Set up monitoring** - Track connection health
5. **Configure backups** - Supabase does this by default

### Scaling

When you add more tenants:

1. Small tenants → Use shared tenant data database
2. Large tenants → Create dedicated database for them
3. Enterprise → Support "Bring Your Own Database"

---

## Getting Help

- 📖 **Detailed Guide:** `DUAL_DATABASE_SETUP_GUIDE.md`
- 🏗️ **Architecture:** `DATABASE_ARCHITECTURE.md`
- 🔄 **Refactor Details:** `DATABASE_REFACTOR_README.md`

---

**Questions or issues?** Check the troubleshooting sections in the guides above.

**Everything working?** Congratulations! You now have a production-ready, scalable, multi-tenant database architecture! 🎉
