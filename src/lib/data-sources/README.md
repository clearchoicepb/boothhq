# DataSourceManager

The `DataSourceManager` is a singleton class that manages tenant-specific database connections and routing in the BoothHQ multi-tenant architecture.

## Overview

BoothHQ uses a dual-database architecture:
- **Application Database**: Stores tenant metadata, users, and authentication data
- **Tenant Data Databases**: Store tenant-specific business data (events, contacts, etc.)

The `DataSourceManager` handles routing queries to the correct tenant database, manages connection pooling, and provides caching for optimal performance.

## Features

- **Singleton Pattern**: Single instance manages all tenant connections
- **Two-Tier Caching**: In-memory + Next.js cache for serverless compatibility
- **Connection Pooling**: Configurable limits prevent resource exhaustion
- **Metrics Tracking**: Monitor cache hit rates and pool utilization
- **Encryption**: AES-256-GCM encryption for sensitive API keys
- **Serverless-Friendly**: Works in both traditional and serverless environments

## Architecture

### Two-Tier Caching Strategy

1. **Tier 1 - In-Memory Cache**: Fastest, but per-instance (doesn't persist across serverless invocations)
   - Configuration cache: 5 minutes TTL (configurable)
   - Client cache: 1 hour TTL (configurable)

2. **Tier 2 - Next.js Cache**: Persistent across serverless function invocations
   - Uses `unstable_cache` with tag-based invalidation
   - Revalidates every 5 minutes
   - Can be disabled for non-serverless environments

### Connection Pool

The connection pool prevents resource exhaustion by limiting concurrent database connections:
- Default limit: 50 clients
- Configurable via environment variable
- Tracks metrics: total created, exhausted count, utilization %

## Usage

### Basic Usage

```typescript
import { dataSourceManager } from '@/lib/data-sources';

// Get a Supabase client for a tenant (service role - bypasses RLS)
const tenantDb = await dataSourceManager.getClientForTenant('tenant-id', true);

// Query the tenant's database
const { data, error } = await tenantDb
  .from('events')
  .select('*')
  .eq('tenant_id', tenantId);
```

### Using Convenience Functions

```typescript
import { getTenantClient, getTenantIdInDataSource } from '@/lib/data-sources';

// Get tenant client
const tenantDb = await getTenantClient('tenant-id');

// Get tenant ID as it appears in the data source
// (may differ from application tenant ID)
const dataTenantId = await getTenantIdInDataSource('tenant-id');
```

### Service Role vs Anon Key

```typescript
// Service role (bypasses RLS) - for server-side operations
const adminDb = await dataSourceManager.getClientForTenant(tenantId, true);

// Anon key (enforces RLS) - for client-side operations
const userDb = await dataSourceManager.getClientForTenant(tenantId, false);
```

## Configuration

### Environment Variables

Configure the `DataSourceManager` behavior using these environment variables:

```bash
# Maximum concurrent database connections
# Default: 50
DATA_SOURCE_MAX_CLIENTS=100

# Enable metrics tracking
# Default: true
DATA_SOURCE_ENABLE_METRICS=true

# Enable Next.js cache for serverless
# Default: true
DATA_SOURCE_USE_NEXTJS_CACHE=true

# Configuration cache TTL (milliseconds)
# Default: 300000 (5 minutes)
DATA_SOURCE_CONFIG_CACHE_TTL=300000

# Client cache TTL (milliseconds)
# Default: 3600000 (1 hour)
DATA_SOURCE_CLIENT_CACHE_TTL=3600000

# Cache cleanup interval (milliseconds)
# Default: 600000 (10 minutes)
DATA_SOURCE_CACHE_CLEANUP_INTERVAL=600000
```

### Programmatic Configuration

```typescript
import { DataSourceManager } from '@/lib/data-sources/manager';

const manager = DataSourceManager.getInstance({
  maxClients: 100,
  enableMetrics: true,
  useNextjsCache: true,
  configCacheTTL: 5 * 60 * 1000,     // 5 minutes
  clientCacheTTL: 60 * 60 * 1000,    // 1 hour
  cacheCleanupInterval: 10 * 60 * 1000, // 10 minutes
});
```

## Performance Monitoring

### Get Cache Statistics

```typescript
const stats = dataSourceManager.getCacheStats();

console.log(stats);
// {
//   configCacheSize: 10,
//   clientCacheSize: 20,
//   maxClients: 50,
//   poolUtilization: 40.0,
//   totalClientsCreated: 25,
//   poolExhaustedCount: 0,
//   cacheHitRate: 85.5,
//   cacheHits: 1000,
//   cacheMisses: 170
// }
```

### Performance Dashboard

Access the built-in performance dashboard at:
```
https://your-domain.com/{tenant}/debug/performance
```

Features:
- Real-time metrics (auto-refresh)
- Cache hit rates
- Pool utilization
- Memory usage
- Health status with alerts
- Performance grades (A-F)
- Optimization recommendations

### Performance API Endpoint

Get metrics programmatically:

```bash
# GET - Retrieve metrics
curl https://your-domain.com/api/debug/performance

# POST - Reset metrics
curl -X POST https://your-domain.com/api/debug/performance
```

## Cache Management

### Clear Tenant Cache

```typescript
// Clear all caches for a specific tenant
await dataSourceManager.clearTenantCache('tenant-id');
```

Call this when:
- Tenant configuration changes
- Database connection strings are updated
- Switching to a new data source

### Clear All Caches

```typescript
// Clear all caches (all tenants)
dataSourceManager.clearAllCaches();
```

Use cautiously - this will force re-fetching for all tenants.

### Reset Metrics

```typescript
// Reset metrics counters (useful for testing)
dataSourceManager.resetMetrics();
```

## Security

### Encryption

API keys are encrypted using **AES-256-GCM** authenticated encryption:

```typescript
// Encrypt an API key (for storage)
const encrypted = dataSourceManager.encryptKey('plain-api-key');
// Returns: "ivBase64:authTagBase64:encryptedBase64"

// Decryption is automatic when fetching tenant config
const { config } = await dataSourceManager.getTenantConnectionConfig(tenantId);
// config.supabaseAnonKey is already decrypted
```

#### Generate Encryption Key

```bash
openssl rand -hex 32
```

Set in `.env.local`:
```bash
ENCRYPTION_KEY=your-64-character-hex-key-here
```

**IMPORTANT**: Keep this key secure! If lost, you cannot decrypt stored API keys.

## Connection Testing

### Test Tenant Connection

```typescript
const result = await dataSourceManager.testTenantConnection('tenant-id');

if (result.success) {
  console.log('Connection successful!', result.diagnostics);
} else {
  console.error('Connection failed:', result.error);
}

// Result structure:
// {
//   success: boolean,
//   responseTimeMs: number,
//   error?: string,
//   diagnostics: {
//     canConnect: boolean,
//     canQuery: boolean,
//     rlsEnabled: boolean
//   }
// }
```

### Get Connection Info

```typescript
const info = await dataSourceManager.getTenantConnectionInfo('tenant-id');

console.log(info);
// {
//   url: 'https://tenant.supabase.co',
//   region: 'us-east-1',
//   poolConfig: { ... },
//   isCached: true,
//   cacheExpiry: Date
// }
```

## Error Handling

### Connection Pool Exhausted

When the connection pool reaches its limit:

```typescript
try {
  const client = await dataSourceManager.getClientForTenant(tenantId);
} catch (error) {
  // Error: Connection pool exhausted: 50/50 clients active.
  // Consider increasing maxClients or reducing tenant load.
}
```

**Solutions**:
1. Increase `DATA_SOURCE_MAX_CLIENTS`
2. Optimize query patterns to reduce concurrent connections
3. Investigate which tenants are using the most connections

### Decryption Errors

```typescript
try {
  const client = await dataSourceManager.getClientForTenant(tenantId);
} catch (error) {
  // Failed to decrypt key: Authentication failed.
  // The key may have been tampered with or encrypted with a different key.
}
```

**Solutions**:
1. Verify `ENCRYPTION_KEY` environment variable is correct
2. Check that API keys were encrypted with the same key
3. Re-encrypt API keys if encryption key changed

## Best Practices

### 1. Use Service Layer

Don't call `dataSourceManager` directly from UI components:

```typescript
// ❌ Bad - Direct usage in component
export default function EventsPage() {
  const client = await dataSourceManager.getClientForTenant(tenantId);
  const { data } = await client.from('events').select('*');
}

// ✅ Good - Use service layer
export default function EventsPage() {
  const events = await eventsService.list({ status: 'all' });
}
```

### 2. Monitor Performance

Check the performance dashboard regularly:
- Cache hit rate should be > 70%
- Pool utilization should be < 75%
- No pool exhaustion events

### 3. Configure for Your Environment

**High Traffic**:
```bash
DATA_SOURCE_MAX_CLIENTS=200
DATA_SOURCE_CLIENT_CACHE_TTL=7200000  # 2 hours
```

**Memory Constrained**:
```bash
DATA_SOURCE_MAX_CLIENTS=25
DATA_SOURCE_CONFIG_CACHE_TTL=60000    # 1 minute
DATA_SOURCE_CLIENT_CACHE_TTL=300000   # 5 minutes
```

**Serverless**:
```bash
DATA_SOURCE_USE_NEXTJS_CACHE=true  # Enable persistent cache
```

**Traditional Server**:
```bash
DATA_SOURCE_USE_NEXTJS_CACHE=false  # In-memory only is faster
```

### 4. Handle Tenant ID Mapping

Some tenants may use different IDs in their data source:

```typescript
// Always use getTenantIdInDataSource for queries
const dataTenantId = await getTenantIdInDataSource(tenantId);

const { data } = await tenantDb
  .from('events')
  .select('*')
  .eq('tenant_id', dataTenantId); // Use mapped ID, not application tenant ID
```

## Testing

### Unit Tests

Comprehensive unit tests are available in `tests/lib/data-sources/manager.test.ts`:

```bash
npm test -- manager.test.ts
```

Tests cover:
- Encryption/decryption
- Cache management
- Connection pool limits
- Metrics tracking

### Manual Testing

```bash
# Test connection to tenant database
curl https://your-domain.com/api/debug/performance

# Check cache stats
curl https://your-domain.com/api/debug/performance | jq '.dataSourceManager.cache'

# Monitor pool utilization
watch -n 5 'curl -s https://your-domain.com/api/debug/performance | jq ".dataSourceManager.connectionPool.utilization"'
```

## Troubleshooting

### Issue: Low Cache Hit Rate

**Symptoms**: Cache hit rate < 50%

**Possible Causes**:
1. Cache TTL too short
2. Too many unique tenants (exceeds cache capacity)
3. Frequent cache invalidation

**Solutions**:
```bash
# Increase cache TTL
DATA_SOURCE_CONFIG_CACHE_TTL=600000    # 10 minutes
DATA_SOURCE_CLIENT_CACHE_TTL=7200000   # 2 hours
```

### Issue: Connection Pool Exhaustion

**Symptoms**: Errors about pool exhaustion

**Possible Causes**:
1. Too many concurrent tenants
2. Connection leaks (not releasing clients)
3. MaxClients set too low

**Solutions**:
```bash
# Increase pool size
DATA_SOURCE_MAX_CLIENTS=100

# Reduce cache TTL (release clients faster)
DATA_SOURCE_CLIENT_CACHE_TTL=1800000   # 30 minutes
```

### Issue: Serverless Cold Starts

**Symptoms**: Slow first request after idle period

**Solutions**:
```bash
# Enable Next.js cache for persistence
DATA_SOURCE_USE_NEXTJS_CACHE=true

# Keep warm with periodic health checks
# Set up monitoring to ping every 5 minutes
```

## Migration Guide

### From Direct Supabase Client

```typescript
// Before
import { createServerSupabaseClient } from '@/lib/supabase-client';
const supabase = createServerSupabaseClient();
const { data } = await supabase.from('events').select('*');

// After
import { getTenantClient } from '@/lib/data-sources';
const tenantDb = await getTenantClient(tenantId);
const { data } = await tenantDb.from('events').select('*');
```

### From fetch() Calls

```typescript
// Before
const response = await fetch('/api/events');
const events = await response.json();

// After
import { eventsService } from '@/lib/api/services/eventsService';
const events = await eventsService.list({ status: 'all' });
```

## Related Documentation

- [Multi-Tenant Architecture](../../docs/ARCHITECTURE.md)
- [Query Key Conventions](../../docs/QUERY_KEY_CONVENTIONS.md)
- [Events Module Audit](../../EVENTS_MODULE_COMPREHENSIVE_AUDIT.md)

## Support

For issues or questions:
1. Check the performance dashboard for health status
2. Review error logs for specific error messages
3. Consult this documentation for troubleshooting steps
4. Check metrics to identify bottlenecks
