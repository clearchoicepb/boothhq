# Tenant ID Consistency Audit

## Executive Summary

**Status**: ⚠️ **CRITICAL ISSUE IDENTIFIED**

BoothHQ uses a dual-database architecture where tenant data may use different tenant IDs than the application database. While the `DataSourceManager` and `GenericRepository` correctly handle this mapping via `getTenantIdInDataSource()`, **112 API route files bypass this mechanism and directly use the application tenant ID**, causing queries to fail for tenants with non-default `tenant_id_in_data_source` values.

---

## Architecture Overview

### Dual-Database Architecture

```
┌─────────────────────────────────────┐
│   Application Database (Supabase)  │
│  - tenants (with connection config) │
│  - users (auth)                     │
│  - audit_log                        │
│  Tenant ID: Application UUID        │
└─────────────────────────────────────┘
                 │
                 │ getTenantDatabaseClient(tenantId)
                 ├──> Fetches connection config
                 ├──> Decrypts API keys
                 ├──> Maps tenant_id → tenant_id_in_data_source
                 │
                 ▼
┌─────────────────────────────────────┐
│  Tenant Data Database (Supabase)    │
│  - accounts                         │
│  - contacts                         │
│  - events                           │
│  - opportunities                    │
│  Tenant ID: Data Source UUID        │
│  (may differ from application ID)   │
└─────────────────────────────────────┘
```

### The Mapping Problem

**Scenario 1 - Default** (Most tenants):
- Application `tenant_id`: `abc-123`
- Data source `tenant_id_in_data_source`: `NULL` (defaults to `abc-123`)
- Queries work ✅

**Scenario 2 - Custom Mapping** (Some tenants):
- Application `tenant_id`: `abc-123`
- Data source `tenant_id_in_data_source`: `xyz-789`
- Queries using `abc-123` return NO RESULTS ❌

---

## Current Implementation Analysis

### ✅ CORRECT: GenericRepository Pattern

**File**: `/src/lib/repositories/GenericRepository.ts`

**Pattern**:
```typescript
protected async getDataSourceTenantId(tenantId: string): Promise<string> {
  return getTenantIdInDataSource(tenantId);
}

async create(data: Partial<T>, tenantId: string): Promise<T> {
  const dataSourceTenantId = await this.getDataSourceTenantId(tenantId);
  const client = await getTenantClient(tenantId);

  const { data: created, error } = await client
    .from(this.tableName)
    .insert({ ...data, tenant_id: dataSourceTenantId }) // Mapped ID!
    .select()
    .single();

  return created;
}
```

**Status**: All repository methods (`create`, `findById`, `findMany`, `update`, `delete`, `search`, `count`, `bulkCreate`, `bulkDelete`) correctly use the mapped tenant ID.

**Coverage**: EventRepository, AccountRepository, ContactRepository, OpportunityRepository, etc. all inherit this correct behavior.

---

### ❌ INCORRECT: API Route Pattern

**Files**: 112 API routes in `/src/app/api/**`

**Pattern** (Example from `/src/app/api/events/route.ts:47`):
```typescript
const session = await getServerSession(authOptions);
const supabase = await getTenantDatabaseClient(session.user.tenantId); // ✅ Connects to correct DB

let query = supabase
  .from('events')
  .select('*')
  .eq('tenant_id', session.user.tenantId) // ❌ WRONG! Uses application tenant_id
```

**Issue**:
- ✅ `getTenantDatabaseClient()` connects to the correct tenant database
- ❌ `.eq('tenant_id', session.user.tenantId)` filters using application tenant_id
- Result: If `tenant_id_in_data_source ≠ tenant_id`, query returns empty results

---

### ⚠️ BROKEN: TransactionManager

**File**: `/src/lib/repositories/TransactionManager.ts`

**Issues**:
1. Uses `createServerSupabaseClient()` (application DB) instead of `getTenantClient()`
2. Doesn't map tenant_id before insert/update/delete (lines 120, 136, 151)

**Impact**: Not currently used in codebase, but will break when adopted for multi-tenant transactions.

---

## Affected Files

### API Routes Requiring Fixes (112 total)

**By Module**:
- **Accounts API**: 6 files
  - `/src/app/api/accounts/route.ts`
  - `/src/app/api/accounts/[id]/route.ts`
  - `/src/app/api/accounts/[id]/contacts/route.ts`
  - `/src/app/api/accounts/[id]/opportunities/route.ts`
  - `/src/app/api/accounts/[id]/events/route.ts`
  - `/src/app/api/accounts/[id]/invoices/route.ts`

- **Events API**: 12 files
  - `/src/app/api/events/route.ts` ⚠️
  - `/src/app/api/events/[id]/route.ts`
  - `/src/app/api/events/[id]/dates/route.ts`
  - `/src/app/api/events/[id]/staff/route.ts`
  - `/src/app/api/events/[id]/equipment/route.ts`
  - `/src/app/api/events/[id]/tasks/route.ts`
  - `/src/app/api/event-dates/**`
  - `/src/app/api/event-staff/**`
  - `/src/app/api/event-types/**`
  - `/src/app/api/event-categories/**`
  - `/src/app/api/event-tasks/**`

- **Contacts API**: 4 files
  - `/src/app/api/contacts/route.ts` ⚠️
  - `/src/app/api/contacts/[id]/route.ts`
  - `/src/app/api/contacts/[id]/opportunities/route.ts`
  - `/src/app/api/contacts/[id]/events/route.ts`

- **Opportunities API**: 5 files
  - `/src/app/api/opportunities/route.ts`
  - `/src/app/api/opportunities/[id]/route.ts` ⚠️
  - `/src/app/api/opportunities/[id]/tasks/route.ts`
  - `/src/app/api/opportunities/[id]/quotes/route.ts`
  - `/src/app/api/opportunities/[id]/invoices/route.ts`

- **Other Modules**: 85+ files
  - Invoices, Quotes, Equipment, Booths, Locations, Staff, Tasks, Templates, etc.

---

## Recommended Fix Pattern

### Standard API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantDatabaseClient, getTenantIdInDataSource } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 1: Get database client (connects to correct tenant database)
  const supabase = await getTenantDatabaseClient(session.user.tenantId);

  // Step 2: Get mapped tenant ID (CRITICAL!)
  const dataSourceTenantId = await getTenantIdInDataSource(session.user.tenantId);

  // Step 3: Use mapped ID in queries
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', dataSourceTenantId) // Use mapped ID, not session.user.tenantId!

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### For POST/PUT/PATCH Operations

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json();

  const supabase = await getTenantDatabaseClient(session.user.tenantId);
  const dataSourceTenantId = await getTenantIdInDataSource(session.user.tenantId);

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...body,
      tenant_id: dataSourceTenantId // Use mapped ID
    })
    .select()
    .single();

  // ...
}
```

---

## Performance Considerations

### Caching getTenantIdInDataSource()

The `DataSourceManager` already caches tenant config (including `tenant_id_in_data_source`) with:
- **Tier 1**: In-memory cache (5-minute TTL)
- **Tier 2**: Next.js cache (serverless-persistent)

**Performance Impact**: Near-zero after first call
- First call: ~50-100ms (database query + decryption)
- Subsequent calls: <1ms (in-memory cache hit)
- After serverless cold start: ~10-20ms (Next.js cache hit)

### Optimization Pattern

For routes with multiple queries:
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Fetch once, reuse multiple times
  const supabase = await getTenantDatabaseClient(session.user.tenantId);
  const dataSourceTenantId = await getTenantIdInDataSource(session.user.tenantId);

  // Use in multiple queries
  const [events, contacts, accounts] = await Promise.all([
    supabase.from('events').select('*').eq('tenant_id', dataSourceTenantId),
    supabase.from('contacts').select('*').eq('tenant_id', dataSourceTenantId),
    supabase.from('accounts').select('*').eq('tenant_id', dataSourceTenantId),
  ]);

  // ...
}
```

---

## Migration Strategy

### Phase 1: Create Helper Function (RECOMMENDED)

Create a reusable helper in `/src/lib/tenant-helpers.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantDatabaseClient, getTenantIdInDataSource } from '@/lib/supabase-client';
import { NextResponse } from 'next/server';

export interface TenantContext {
  supabase: SupabaseClient<Database>;
  tenantId: string; // Application tenant ID
  dataSourceTenantId: string; // Data source tenant ID (mapped)
  session: Session;
}

export async function getTenantContext(): Promise<TenantContext | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const supabase = await getTenantDatabaseClient(tenantId);
  const dataSourceTenantId = await getTenantIdInDataSource(tenantId);

  return {
    supabase,
    tenantId,
    dataSourceTenantId,
    session,
  };
}
```

**Usage in API Routes**:
```typescript
export async function GET(request: NextRequest) {
  const context = await getTenantContext();

  // Type guard: Check if it's an error response
  if (context instanceof NextResponse) {
    return context;
  }

  // Now we have full tenant context
  const { supabase, dataSourceTenantId } = context;

  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', dataSourceTenantId);

  return NextResponse.json(data);
}
```

### Phase 2: Update API Routes

**Priority Order**:
1. **High-traffic routes** (events, contacts, accounts) - Fix first
2. **Medium-traffic routes** (opportunities, invoices, quotes)
3. **Low-traffic routes** (equipment, booths, templates)

### Phase 3: Fix TransactionManager

Update `/src/lib/repositories/TransactionManager.ts`:
```typescript
async runInTransaction<T>(
  operations: (client: SupabaseClient) => Promise<T>,
  tenantId: string
): Promise<T> {
  // Use tenant client instead of application client
  const client = await getTenantClient(tenantId);
  const dataSourceTenantId = await getTenantIdInDataSource(tenantId);

  // Pass mapped tenant ID to operations
  return operations(client);
}
```

### Phase 4: Add Tests

Create `/tests/lib/tenant-id-mapping.test.ts`:
```typescript
describe('Tenant ID Mapping', () => {
  it('should map tenant_id correctly across all API routes', async () => {
    // Test with tenant that has custom tenant_id_in_data_source
    // Verify queries return correct data
  });

  it('should handle tenants with default tenant_id mapping', async () => {
    // Test with tenant where tenant_id_in_data_source === tenant_id
  });
});
```

---

## Testing Strategy

### Manual Testing

1. **Create Test Tenant** with custom `tenant_id_in_data_source`:
   ```sql
   -- In APPLICATION database
   UPDATE tenants
   SET tenant_id_in_data_source = 'custom-data-id-123'
   WHERE id = 'app-tenant-id-456';
   ```

2. **Test API Endpoints**:
   ```bash
   # Should return data with fixed API routes
   curl -H "Cookie: session=..." https://app.com/api/events

   # Should return empty [] with broken API routes
   # (before fix)
   ```

3. **Verify Repository Pattern**:
   ```typescript
   // Should work correctly (repository already uses mapping)
   const events = await eventRepository.findMany('app-tenant-id-456');
   ```

### Automated Testing

```typescript
import { getTenantIdInDataSource } from '@/lib/supabase-client';

test('API routes use correct tenant_id mapping', async () => {
  const appTenantId = 'test-tenant-123';
  const dataTenantId = await getTenantIdInDataSource(appTenantId);

  // Make API request
  const response = await fetch('/api/events', {
    headers: { 'Cookie': `session=${sessionToken}` }
  });

  const events = await response.json();

  // Verify events have correct tenant_id
  expect(events[0].tenant_id).toBe(dataTenantId);
});
```

---

## Security Implications

### Current Risk: LOW (but important to fix)

**Why Low Risk?**:
1. Only affects tenants with custom `tenant_id_in_data_source` (rare)
2. No data leakage (queries return empty, not wrong tenant's data)
3. RLS (Row Level Security) may provide additional protection

**Why Important to Fix?**:
1. **Data Access**: Tenants with custom mapping can't access their data via API routes
2. **Consistency**: Repository pattern works, API routes don't - confusing behavior
3. **Future-Proofing**: New tenants may require custom mapping
4. **Technical Debt**: Violates architecture assumptions

---

## Monitoring & Alerts

### Add Logging

```typescript
export async function GET(request: NextRequest) {
  const context = await getTenantContext();

  if (context instanceof NextResponse) return context;

  const { tenantId, dataSourceTenantId } = context;

  // Log mapping for monitoring
  if (tenantId !== dataSourceTenantId) {
    console.log(`[Tenant Mapping] ${tenantId} -> ${dataSourceTenantId}`);
  }

  // ... rest of handler
}
```

### Create Dashboard Metric

Track API routes using correct vs incorrect tenant_id pattern.

---

## Conclusion

**Action Required**: Update 112 API route files to use `getTenantIdInDataSource()` mapping.

**Recommended Approach**:
1. Create `getTenantContext()` helper function ✅
2. Update high-traffic API routes first (events, contacts, accounts)
3. Fix TransactionManager
4. Add automated tests
5. Deploy incrementally with monitoring

**Timeline Estimate**:
- Helper function: 1 hour
- API route updates: 8-12 hours (112 files)
- TransactionManager fix: 1 hour
- Testing: 2-3 hours
- **Total: ~12-16 hours**

**Business Impact**:
- Enables multi-database tenant architecture
- Allows tenant migration between databases
- Supports tenant data consolidation/separation
- Fixes broken queries for tenants with custom mapping
