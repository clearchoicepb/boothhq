# Database Refactoring: Separated Application & Tenant Data

## 🎯 Overview

This refactor separates the application's database architecture into two distinct layers:

1. **Application Database**: Stores metadata only (tenants, users, authentication)
2. **Tenant Data Databases**: Store all business/operational data

This architecture provides enhanced security, scalability, and flexibility for multi-tenant applications.

## 📋 Table of Contents

- [Why This Refactor](#why-this-refactor)
- [Architecture Overview](#architecture-overview)
- [What Changed](#what-changed)
- [Setup Instructions](#setup-instructions)
- [Migration Guide](#migration-guide)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Rollback Plan](#rollback-plan)

## 🤔 Why This Refactor

### Problems with Previous Architecture
- Application and tenant data mixed in one database
- Security risk: Application DB compromise exposes all tenant data
- Difficult to scale individual tenants independently
- Cannot support "Bring Your Own Database" (BYOD) for enterprise customers
- All tenants share the same database resources

### Benefits of New Architecture
- ✅ **Enhanced Security**: Application metadata separated from tenant business data
- ✅ **Scalability**: Scale tenant databases independently
- ✅ **Compliance**: Store tenant data in specific regions/jurisdictions
- ✅ **BYOD Support**: Enterprise customers can bring their own database
- ✅ **Performance Isolation**: Heavy tenants don't impact others
- ✅ **Cost Efficiency**: Shared resources for small tenants, dedicated for enterprise

## 🏗️ Architecture Overview

### Before (Single Database)
```
┌─────────────────────────────────────┐
│     SINGLE DATABASE                 │
│  - tenants (metadata)               │
│  - users (auth)                     │
│  - accounts (tenant data)           │
│  - contacts (tenant data)           │
│  - events (tenant data)             │
│  - ... all data mixed ...           │
└─────────────────────────────────────┘
```

### After (Separated Databases)
```
┌─────────────────────────────────────┐
│   APPLICATION DATABASE              │
│   - tenants (with connection info)  │
│   - users (authentication)          │
│   - audit_log (system audit)        │
│   - NO business data                │
└─────────────────────────────────────┘
           │
           │ Tenant Routing (DataSourceManager)
           │
    ┌──────┴──────┬──────────────┬─────────────┐
    ↓             ↓              ↓             ↓
┌────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐
│Shared  │   │Shared  │   │Dedicated │   │Customer  │
│Tenant  │   │Tenant  │   │Single    │   │BYOD      │
│Data #1 │   │Data #2 │   │Tenant DB │   │PostgreSQL│
└────────┘   └────────┘   └──────────┘   └──────────┘
Tenants A,B  Tenants C,D  Tenant E       Tenant F
```

## 🔄 What Changed

### 1. Database Schema Changes

#### Application Database (Main Supabase Project)
**New Columns in `tenants` table:**
- `data_source_url` - URL to tenant's data database
- `data_source_anon_key` - Encrypted anon key
- `data_source_service_key` - Encrypted service role key
- `data_source_region` - Database region
- `connection_pool_config` - Connection pool settings (JSONB)
- `data_source_notes` - Admin notes
- `tenant_id_in_data_source` - Tenant ID in the data database

**Migration File:**
```
/supabase/migrations/20251027000001_add_tenant_data_source_config.sql
```

#### Tenant Data Database Schema
**New Complete Schema:**
```
/supabase/tenant-data-db-schema.sql
```

This schema includes all business data tables:
- Core CRM: accounts, contacts, leads, opportunities
- Events: events, event_dates, locations, etc.
- Equipment: booths, equipment_items, etc.
- Financial: invoices, payments, quotes, etc.
- Operations: tasks, contracts, templates, etc.

### 2. New Data Source Manager

**Location:** `/src/lib/data-sources/`

**Key Files:**
- `types.ts` - Type definitions for connection configs
- `manager.ts` - DataSourceManager singleton class
- `index.ts` - Exports

**Key Features:**
- Connection configuration caching (5 min TTL)
- Supabase client caching (1 hour TTL)
- Automatic tenant routing
- Connection testing utilities
- Encryption/decryption support (placeholder)

### 3. Updated GenericRepository

**Location:** `/src/lib/repositories/GenericRepository.ts`

**Changes:**
- No longer creates a single Supabase client in constructor
- New methods:
  - `getClientForTenant(tenantId)` - Gets tenant-specific client
  - `getDataSourceTenantId(tenantId)` - Gets tenant ID in data source
- All CRUD methods now use tenant routing:
  - `create()`, `findById()`, `findMany()`
  - `update()`, `delete()`, `search()`
  - `count()`, `bulkCreate()`, `bulkDelete()`
  - `paginate()` (indirectly through count/findMany)

### 4. Documentation

- `DATABASE_ARCHITECTURE.md` - Comprehensive architecture documentation
- `DATABASE_REFACTOR_README.md` - This file (setup and migration guide)

## 🚀 Setup Instructions

### Prerequisites

1. **Application Database** (Main Supabase Project)
   - Existing project with tenants, users, audit_log tables

2. **Tenant Data Database** (New Supabase Project or PostgreSQL)
   - New Supabase project OR
   - PostgreSQL database (v13+)

### Step 1: Apply Migration to Application Database

```bash
# Run the migration to add connection string columns
psql $APPLICATION_DATABASE_URL -f supabase/migrations/20251027000001_add_tenant_data_source_config.sql
```

Or using Supabase CLI:
```bash
supabase db push --project-ref <your-app-project-ref>
```

### Step 2: Create Tenant Data Database

**Option A: New Supabase Project**
```bash
# Create new Supabase project via dashboard
# Then apply the schema
psql $TENANT_DATA_DATABASE_URL -f supabase/tenant-data-db-schema.sql
```

**Option B: Using Supabase CLI**
```bash
supabase init
supabase start
supabase db reset --db-url $TENANT_DATA_DATABASE_URL < supabase/tenant-data-db-schema.sql
```

### Step 3: Configure Environment Variables

Create or update `.env.local`:

```bash
# ===== APPLICATION DATABASE =====
# Main Supabase project (metadata only)
NEXT_PUBLIC_SUPABASE_URL=https://your-app-database.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# ===== DEFAULT TENANT DATA DATABASE =====
# Default/shared data source for new tenants
DEFAULT_TENANT_DATA_URL=https://your-tenant-data.supabase.co
DEFAULT_TENANT_DATA_ANON_KEY=eyJhb...
DEFAULT_TENANT_DATA_SERVICE_KEY=eyJhb...

# ===== ENCRYPTION =====
# Used to encrypt/decrypt tenant connection strings
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-32-byte-hex-key

# ===== OTHER =====
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

### Step 4: Update Tenant Records

Update existing tenant records with connection strings:

```sql
-- Application Database
UPDATE tenants
SET
  data_source_url = 'https://your-tenant-data.supabase.co',
  data_source_anon_key = 'eyJhb...',  -- TODO: Encrypt in production
  data_source_service_key = 'eyJhb...',  -- TODO: Encrypt in production
  data_source_region = 'us-east-1',
  tenant_id_in_data_source = id::text  -- Use same ID
WHERE data_source_url IS NULL;
```

### Step 5: Migrate Tenant Data (Optional)

If you have existing tenant data in the application database, migrate it to the tenant data database:

```bash
# Export tenant data from application DB
pg_dump --data-only --table=accounts --table=contacts --table=opportunities ... \
  $APPLICATION_DATABASE_URL > tenant_data_export.sql

# Import to tenant data DB
psql $TENANT_DATA_DATABASE_URL < tenant_data_export.sql

# Verify migration
psql $TENANT_DATA_DATABASE_URL -c "SELECT COUNT(*) FROM accounts;"
```

## 📚 Usage Examples

### Using DataSourceManager Directly

```typescript
import { getTenantClient, dataSourceManager } from '@/lib/data-sources';

// Get tenant-specific client
const tenantDb = await getTenantClient('tenant-id-here', true);

// Query tenant data
const { data: accounts } = await tenantDb
  .from('accounts')
  .select('*')
  .eq('tenant_id', await dataSourceManager.getTenantIdInDataSource('tenant-id-here'));

// Test connection
const testResult = await dataSourceManager.testTenantConnection('tenant-id-here');
console.log('Connection test:', testResult);

// Get connection info (for debugging)
const info = await dataSourceManager.getTenantConnectionInfo('tenant-id-here');
console.log('Connection info:', info);

// Clear cache when tenant config changes
dataSourceManager.clearTenantCache('tenant-id-here');
```

### Using GenericRepository (Recommended)

```typescript
import { GenericRepository } from '@/lib/repositories/GenericRepository';

// Create repository instance
const accountsRepo = new GenericRepository('accounts');

// Create record (automatically routed to correct tenant database)
const newAccount = await accountsRepo.create({
  name: 'Acme Corp',
  email: 'info@acme.com',
}, tenantId);

// Find records
const accounts = await accountsRepo.findMany(tenantId, {
  where: { status: 'active' },
  orderBy: { field: 'name', direction: 'asc' },
  limit: 50
});

// Update record
await accountsRepo.update(accountId, { name: 'Acme Corporation' }, tenantId);

// Delete record
await accountsRepo.delete(accountId, tenantId);

// The repository handles all tenant routing automatically!
```

### API Route Example

```typescript
// /src/app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GenericRepository } from '@/lib/repositories/GenericRepository';

export async function GET(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountsRepo = new GenericRepository('accounts');

  // GenericRepository automatically routes to tenant's data database
  const accounts = await accountsRepo.findMany(session.user.tenantId);

  return NextResponse.json({ data: accounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const accountsRepo = new GenericRepository('accounts');

  // Automatically routed to correct tenant database
  const newAccount = await accountsRepo.create(body, session.user.tenantId);

  return NextResponse.json({ data: newAccount }, { status: 201 });
}
```

## 🧪 Testing

### Test Connection to Tenant Database

```typescript
// Test script: scripts/test-tenant-connection.ts
import { dataSourceManager } from '@/lib/data-sources';

async function testConnection(tenantId: string) {
  console.log(`Testing connection for tenant: ${tenantId}`);

  const result = await dataSourceManager.testTenantConnection(tenantId);

  if (result.success) {
    console.log('✅ Connection successful!');
    console.log(`Response time: ${result.responseTimeMs}ms`);
    console.log('Diagnostics:', result.diagnostics);
  } else {
    console.error('❌ Connection failed:', result.error);
  }
}

testConnection('your-tenant-id-here');
```

### Verify Tenant Data Routing

```bash
# Run test queries to verify data is coming from correct database
npm run test:tenant-routing

# Or manually:
node -e "
  const { getTenantClient } = require('./src/lib/data-sources');
  (async () => {
    const client = await getTenantClient('tenant-id', true);
    const { data } = await client.from('accounts').select('count');
    console.log('Accounts in tenant DB:', data);
  })();
"
```

## 🔙 Rollback Plan

If issues arise, you can rollback to the previous architecture:

### Option 1: Revert Git Branch

```bash
# Switch back to main branch
git checkout main

# Delete refactoring branch
git branch -D claude/refactor-data-sources-011CUUaeu6zepZ7xEFmofpbf

# Restore from backup tag
git checkout backup-main-20251027-125930
```

### Option 2: Revert Database Changes

```sql
-- Application Database: Remove new columns (optional)
ALTER TABLE tenants
  DROP COLUMN IF EXISTS data_source_url,
  DROP COLUMN IF EXISTS data_source_anon_key,
  DROP COLUMN IF EXISTS data_source_service_key,
  DROP COLUMN IF EXISTS data_source_region,
  DROP COLUMN IF EXISTS connection_pool_config,
  DROP COLUMN IF EXISTS data_source_notes,
  DROP COLUMN IF EXISTS tenant_id_in_data_source;

-- Revert GenericRepository changes by checking out old version
git checkout main -- src/lib/repositories/GenericRepository.ts

-- Remove data-sources directory
rm -rf src/lib/data-sources/
```

### Option 3: Keep Both Systems Running (Gradual Migration)

You can temporarily support both architectures:

```typescript
// src/lib/repositories/GenericRepository.ts
async getClientForTenant(tenantId: string) {
  // Check if tenant has data source configured
  const config = await this.getTenantConnectionConfig(tenantId);

  if (config.data_source_url) {
    // Use new architecture (tenant data database)
    return getTenantClient(tenantId, true);
  } else {
    // Fall back to old architecture (shared application database)
    return createServerSupabaseClient();
  }
}
```

## 📊 Monitoring & Observability

### Cache Statistics

```typescript
import { dataSourceManager } from '@/lib/data-sources';

// Get cache statistics
const stats = dataSourceManager.getCacheStats();
console.log('Config cache size:', stats.configCacheSize);
console.log('Client cache size:', stats.clientCacheSize);
```

### Connection Monitoring

```typescript
// Monitor connection health for all tenants
import { dataSourceManager } from '@/lib/data-sources';

async function monitorAllTenants(tenantIds: string[]) {
  const results = await Promise.all(
    tenantIds.map(id => dataSourceManager.testTenantConnection(id))
  );

  results.forEach((result, index) => {
    console.log(`Tenant ${tenantIds[index]}:`, result.success ? '✅' : '❌');
  });
}
```

## 🔒 Security Considerations

### Encryption

**IMPORTANT**: Connection strings contain sensitive credentials and MUST be encrypted in production.

**Current Status**: Placeholder implementation (stores in plain text)

**TODO**: Implement actual encryption using one of:

1. **AWS KMS** (Recommended for AWS deployments)
   ```typescript
   import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
   ```

2. **HashiCorp Vault** (Recommended for multi-cloud)
   ```typescript
   import * as vault from 'node-vault';
   ```

3. **Node.js crypto** (Simple option)
   ```typescript
   const crypto = require('crypto');
   const algorithm = 'aes-256-gcm';
   ```

4. **Supabase Vault** (If using Supabase)
   ```sql
   SELECT vault.create_secret('secret-key-here');
   ```

### Best Practices

1. ✅ **Never log connection strings** - Use `getTenantConnectionInfo()` which excludes keys
2. ✅ **Rotate keys regularly** - Implement key rotation schedule
3. ✅ **Audit all changes** - Monitor tenant config changes via audit_log
4. ✅ **Use RLS policies** - Enable Row Level Security on all tenant data tables
5. ✅ **Limit connection pools** - Prevent resource exhaustion
6. ✅ **Monitor connection failures** - Alert on repeated failures

## 🆘 Troubleshooting

### Issue: "Tenant has no data source configured"

**Cause**: Tenant record missing connection string information

**Solution**:
```sql
-- Check tenant configuration
SELECT id, name, data_source_url FROM tenants WHERE id = 'tenant-id-here';

-- Update tenant with data source
UPDATE tenants SET
  data_source_url = 'https://your-tenant-data.supabase.co',
  data_source_anon_key = '...',
  data_source_service_key = '...'
WHERE id = 'tenant-id-here';
```

### Issue: "Failed to fetch tenant connection config"

**Cause**: Cannot connect to Application Database

**Solution**:
```bash
# Verify APPLICATION database connection
psql $NEXT_PUBLIC_SUPABASE_URL -c "SELECT version();"

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Issue: Connection test fails

**Cause**: Cannot connect to Tenant Data Database

**Solution**:
```typescript
// Get detailed connection info
const info = await dataSourceManager.getTenantConnectionInfo('tenant-id');
console.log('Trying to connect to:', info.url);

// Test manually
const client = await getTenantClient('tenant-id', true);
const { data, error } = await client.from('accounts').select('count');
console.log('Manual test:', { data, error });
```

### Issue: "tenant_id not found" in queries

**Cause**: Tenant ID mismatch between application and data source

**Solution**:
```typescript
// Check tenant ID mapping
const appTenantId = 'tenant-id-from-application';
const dataTenantId = await getTenantIdInDataSource(appTenantId);

console.log('Application tenant ID:', appTenantId);
console.log('Data source tenant ID:', dataTenantId);

// Update if needed
UPDATE tenants
SET tenant_id_in_data_source = 'correct-id-here'
WHERE id = 'tenant-id-from-application';
```

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review `DATABASE_ARCHITECTURE.md` for architecture details
3. Check the implementation in `/src/lib/data-sources/`
4. Review test scripts in `/scripts/`

## 🎉 Summary

This refactor provides a robust, scalable, and secure multi-tenant database architecture. The implementation:

- ✅ Separates application metadata from tenant business data
- ✅ Supports shared, dedicated, and BYOD database models
- ✅ Provides transparent tenant routing via DataSourceManager
- ✅ Maintains backward compatibility with GenericRepository interface
- ✅ Includes comprehensive documentation and testing utilities

**Next Steps:**
1. Apply migrations to your databases
2. Configure environment variables
3. Update tenant records with connection strings
4. Test with a sample tenant
5. Gradually migrate tenants to new architecture
6. Implement encryption for production
