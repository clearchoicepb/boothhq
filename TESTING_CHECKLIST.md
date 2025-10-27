# Testing Checklist: Database Refactoring on Vercel

## 🚨 Pre-Flight Checks

### 1. Verify Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Ensure these are set:

```bash
# Application Database (Main Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-app-database.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Default Tenant Data Database
DEFAULT_TENANT_DATA_URL=https://your-tenant-data.supabase.co
DEFAULT_TENANT_DATA_ANON_KEY=eyJhb...
DEFAULT_TENANT_DATA_SERVICE_KEY=eyJhb...

# Encryption (can be placeholder for testing)
ENCRYPTION_KEY=test-key-for-development-only

# NextAuth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

⚠️ **IMPORTANT**: After adding/changing env vars, you MUST redeploy!

### 2. Verify Database Migrations Applied

**Application Database:**
```sql
-- Connect to your Application DB and verify:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('data_source_url', 'data_source_anon_key');
```

Expected: Should return both columns

**Tenant Data Database:**
```sql
-- Connect to your Tenant Data DB and verify:
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('accounts', 'contacts', 'opportunities');
```

Expected: Should return 3 (or more if other tables exist)

### 3. Update Tenant Records with Connection Strings

**CRITICAL**: Tenants need data source configuration:

```sql
-- Application Database
UPDATE tenants
SET
  data_source_url = 'https://your-tenant-data.supabase.co',
  data_source_anon_key = 'eyJhb...',  -- Your tenant data anon key
  data_source_service_key = 'eyJhb...',  -- Your tenant data service key
  data_source_region = 'us-east-1',
  tenant_id_in_data_source = id::text
WHERE data_source_url IS NULL;

-- Verify
SELECT id, name, data_source_url
FROM tenants
LIMIT 5;
```

---

## ✅ Functional Tests

### Test 1: Application Loads Without Errors

**Test**: Visit your Vercel deployment

**Expected**:
- ✅ Application loads successfully
- ✅ No console errors related to database connections
- ✅ Login page appears (if applicable)

**How to Check**:
```
1. Open: https://your-app.vercel.app
2. Open browser DevTools (F12)
3. Check Console tab for errors
```

**Pass Criteria**: No errors like:
- ❌ "Failed to fetch tenant connection config"
- ❌ "Tenant has no data source configured"
- ❌ "Cannot read property of undefined"

---

### Test 2: User Authentication Works

**Test**: Log in with a test user

**Expected**:
- ✅ Login form works
- ✅ User can authenticate
- ✅ Session is created
- ✅ User is redirected to dashboard

**How to Check**:
```
1. Navigate to /login
2. Enter valid credentials
3. Click "Sign In"
4. Should redirect to dashboard
```

**Pass Criteria**:
- User successfully logs in
- Session cookie is set
- Can access protected routes

---

### Test 3: Tenant Routing Works (CRITICAL)

**Test**: Verify queries go to correct tenant database

**Expected**:
- ✅ Data is fetched from Tenant Data DB, not Application DB
- ✅ Tenant-specific data is returned
- ✅ No cross-tenant data leakage

**How to Check**:

**Option A: Via Browser Console**
```javascript
// Open browser console (F12) on any authenticated page
fetch('/api/accounts')
  .then(r => r.json())
  .then(data => console.log('Accounts:', data));

// Expected: Returns accounts from Tenant Data DB
```

**Option B: Via API Test**
```bash
# From your terminal (replace with your Vercel URL)
curl -X GET 'https://your-app.vercel.app/api/accounts' \
  -H 'Cookie: your-session-cookie-here' \
  | jq .
```

**Option C: Via Vercel Logs**
```
1. Go to: Vercel Dashboard → Deployments → Latest → Functions
2. Look for logs from API routes
3. Should NOT see errors about tenant routing
```

**Pass Criteria**:
- API returns data successfully
- No errors in Vercel logs
- Data is tenant-specific

---

### Test 4: CRUD Operations Work

**Test**: Create, Read, Update, Delete operations

**Expected**:
- ✅ Can create new records
- ✅ Can read existing records
- ✅ Can update records
- ✅ Can delete records
- ✅ All operations go to Tenant Data DB

**How to Check**:

**Create Test**:
```javascript
// Browser console on authenticated page
fetch('/api/accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Account ' + Date.now(),
    email: 'test@example.com'
  })
})
  .then(r => r.json())
  .then(data => {
    console.log('Created:', data);
    window.testAccountId = data.data.id; // Save for later tests
  });
```

**Read Test**:
```javascript
// Browser console
fetch('/api/accounts')
  .then(r => r.json())
  .then(data => console.log('Accounts:', data));
```

**Update Test**:
```javascript
// Browser console (use ID from create test)
fetch(`/api/accounts/${window.testAccountId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Updated Test Account'
  })
})
  .then(r => r.json())
  .then(data => console.log('Updated:', data));
```

**Delete Test**:
```javascript
// Browser console
fetch(`/api/accounts/${window.testAccountId}`, {
  method: 'DELETE'
})
  .then(r => r.json())
  .then(data => console.log('Deleted:', data));
```

**Pass Criteria**:
- All operations return success
- Data persists correctly
- No database errors

---

### Test 5: Data Source Connection Info (Debugging)

**Test**: Verify DataSourceManager can retrieve connection info

**Create test endpoint**: `/src/app/api/debug/tenant-connection/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { dataSourceManager } from '@/lib/data-sources';

export async function GET(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get connection info (no sensitive keys)
    const info = await dataSourceManager.getTenantConnectionInfo(session.user.tenantId);

    // Test connection
    const testResult = await dataSourceManager.testTenantConnection(session.user.tenantId);

    // Get cache stats
    const cacheStats = dataSourceManager.getCacheStats();

    return NextResponse.json({
      tenantId: session.user.tenantId,
      connectionInfo: info,
      connectionTest: testResult,
      cacheStats,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
```

**How to Check**:
```bash
curl https://your-app.vercel.app/api/debug/tenant-connection \
  -H 'Cookie: your-session-cookie' \
  | jq .
```

**Expected Response**:
```json
{
  "tenantId": "uuid-here",
  "connectionInfo": {
    "url": "https://your-tenant-data.supabase.co",
    "region": "us-east-1",
    "isCached": true
  },
  "connectionTest": {
    "success": true,
    "responseTimeMs": 150,
    "diagnostics": {
      "canConnect": true,
      "canQuery": true,
      "rlsEnabled": true
    }
  },
  "cacheStats": {
    "configCacheSize": 1,
    "clientCacheSize": 2
  }
}
```

**Pass Criteria**:
- `connectionTest.success` is `true`
- `responseTimeMs` is reasonable (<500ms)
- No errors in response

---

### Test 6: Multiple Tenants (No Data Leakage)

**Test**: Ensure tenant isolation works

**Expected**:
- ✅ Tenant A only sees their data
- ✅ Tenant B only sees their data
- ✅ No cross-tenant data access

**How to Check**:

1. **Create test data for Tenant A**:
```sql
-- Tenant Data DB
INSERT INTO accounts (id, tenant_id, name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'tenant-a-id', 'Tenant A Account'),
  ('22222222-2222-2222-2222-222222222222', 'tenant-b-id', 'Tenant B Account');
```

2. **Login as Tenant A user** → Check `/api/accounts`
   - Should only see "Tenant A Account"

3. **Login as Tenant B user** → Check `/api/accounts`
   - Should only see "Tenant B Account"

**Pass Criteria**:
- Each tenant only sees their own data
- No cross-tenant data leakage

---

### Test 7: Performance & Caching

**Test**: Verify caching improves performance

**How to Check**:

```javascript
// Browser console - First request (should hit database)
console.time('First Request');
await fetch('/api/accounts').then(r => r.json());
console.timeEnd('First Request');

// Second request (should use cache)
console.time('Second Request');
await fetch('/api/accounts').then(r => r.json());
console.timeEnd('Second Request');

// Should be faster due to caching
```

**Expected**:
- First request: ~200-500ms
- Second request: ~50-200ms (faster due to cache)

**Pass Criteria**:
- Second request is faster
- No performance degradation vs. old architecture

---

### Test 8: Error Handling

**Test**: Verify graceful error handling

**Test Scenarios**:

1. **Invalid Tenant ID**:
```javascript
// Manually test with invalid tenant ID
// Should return clear error message
```

2. **Missing Connection Config**:
```sql
-- Temporarily remove connection string
UPDATE tenants SET data_source_url = NULL WHERE id = 'test-tenant-id';
```
Expected: Error "Tenant has no data source configured"

3. **Invalid Connection String**:
```sql
-- Set invalid URL
UPDATE tenants SET data_source_url = 'https://invalid-url.supabase.co' WHERE id = 'test-tenant-id';
```
Expected: Connection test fails gracefully

**Pass Criteria**:
- Errors are caught and logged
- User sees friendly error message
- Application doesn't crash

---

## 🔍 Monitoring Tests

### Test 9: Check Vercel Logs

**How to Check**:
```
1. Go to: Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Click "Functions" tab
4. Look for your API routes (e.g., /api/accounts)
5. Check logs for errors
```

**Look for**:
- ✅ No "Failed to fetch tenant connection config" errors
- ✅ No "Tenant has no data source configured" errors
- ✅ No unhandled promise rejections
- ✅ Successful database queries

**Red Flags**:
- ❌ Repeated connection failures
- ❌ Timeout errors
- ❌ RLS policy violations
- ❌ tenant_id not found errors

---

### Test 10: Database Connection Counts

**Test**: Ensure connection pooling works

**How to Check**:

**Supabase Dashboard**:
```
1. Go to: Supabase Dashboard → Your Tenant Data Project
2. Click "Database" → "Connection Pooling"
3. Monitor active connections
```

**Pass Criteria**:
- Connection count stays within pool limits (default: 2-10)
- No connection exhaustion
- Connections are reused

---

## 🚨 Critical Issues to Watch For

### Issue 1: "Tenant has no data source configured"

**Cause**: Tenant record missing connection strings

**Fix**:
```sql
-- Application DB
UPDATE tenants
SET
  data_source_url = 'https://your-tenant-data.supabase.co',
  data_source_anon_key = 'eyJhb...',
  data_source_service_key = 'eyJhb...'
WHERE id = 'failing-tenant-id';
```

### Issue 2: "Cannot connect to tenant database"

**Cause**: Invalid connection string or network issue

**Fix**:
1. Verify URL is correct
2. Check Supabase project is active
3. Verify API keys are valid
4. Test connection manually:
```bash
psql "postgres://postgres:[YOUR-PASSWORD]@db.project.supabase.co:5432/postgres"
```

### Issue 3: "tenant_id column does not exist"

**Cause**: Querying Application DB instead of Tenant Data DB

**Fix**:
- Verify tenant record has `data_source_url` set
- Check Vercel env vars are correct
- Restart Vercel deployment

### Issue 4: No data returned

**Cause**: Data still in old database, not migrated

**Fix**:
- Check if data exists in Tenant Data DB
- If not, run data migration (see DATABASE_REFACTOR_README.md)

---

## 📋 Testing Summary Checklist

Use this quick checklist:

- [ ] Environment variables configured in Vercel
- [ ] Application DB migration applied
- [ ] Tenant Data DB schema created
- [ ] Tenant records updated with connection strings
- [ ] Application loads without errors
- [ ] User authentication works
- [ ] API routes return data
- [ ] CRUD operations work
- [ ] Connection test endpoint works
- [ ] Tenant isolation verified (no data leakage)
- [ ] Performance is acceptable
- [ ] Caching is working
- [ ] Error handling is graceful
- [ ] Vercel logs show no errors
- [ ] Database connection pooling works

---

## 🎯 Success Criteria

✅ **PASS** if:
- All tests above pass
- No errors in Vercel logs
- Data is correctly isolated per tenant
- Performance is same or better than before
- CRUD operations work end-to-end

❌ **FAIL** if:
- Any test fails repeatedly
- Data leakage between tenants
- Connection errors in logs
- Application crashes or hangs

---

## 🆘 If Tests Fail

1. **Check Vercel Logs**: Most issues show up here first
2. **Verify Environment Variables**: Missing vars are common cause
3. **Check Database Connections**: Manually test with psql
4. **Review Connection Strings**: Ensure tenant records are correct
5. **Contact Support**: Share specific error messages and logs

---

## 📞 Getting Help

If you encounter issues:

1. Check the `DATABASE_REFACTOR_README.md` troubleshooting section
2. Review Vercel function logs
3. Check Supabase project status
4. Verify all environment variables
5. Share specific error messages for faster diagnosis
