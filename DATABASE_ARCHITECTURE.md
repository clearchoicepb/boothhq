# Database Architecture: Separated Application & Tenant Data

## Overview

This application uses a **separated database architecture** where application metadata is completely isolated from tenant business data. This provides:

- ✅ Enhanced security (application DB compromise doesn't expose tenant data)
- ✅ Scalability (scale tenant databases independently)
- ✅ Compliance (store tenant data in specific regions/jurisdictions)
- ✅ BYOD Support (enterprise customers can bring their own database)
- ✅ Performance isolation (heavy tenants don't impact others)

## Architecture Diagram

```
┌─────────────────────────────────────┐
│   APPLICATION DATABASE              │
│   (Main Supabase Project)           │
│   - tenants (with connection info)  │
│   - users (authentication)          │
│   - audit_log (system audit)        │
│   - NO business data                │
└─────────────────────────────────────┘
           │
           │ Tenant Routing via DataSourceManager
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

## Database Separation

### APPLICATION DATABASE (Metadata Only)

**Purpose**: Store only application-level metadata, authentication, and system audit logs.

**Tables** (3 total):
- `tenants` - Tenant metadata + connection strings to their data databases
- `users` - User authentication and authorization
- `audit_log` - System-level audit trail

**Critical Rule**: NO tenant business data should exist here. The ONLY place tenant_id appears is in these three tables for routing/auth purposes.

### TENANT DATA DATABASES (Business Data)

**Purpose**: Store all tenant business/operational data.

**Tables** (45+ tables):

#### Core CRM
- `accounts` - Companies/organizations
- `contacts` - Individual people
- `contact_accounts` - Many-to-many relationship
- `leads` - Sales leads
- `opportunities` - Sales opportunities
- `opportunity_line_items` - Opportunity details

#### Events
- `events` - Event records
- `event_dates` - Event scheduling
- `event_categories` - Event categorization
- `event_types` - Event type definitions
- `event_staff_assignments` - Staff assigned to events
- `event_design_items` - Custom design items
- `event_custom_items` - Custom event additions
- `event_core_task_completion` - Task tracking

#### Equipment & Inventory
- `equipment_types` - Equipment type definitions
- `equipment_items` - Physical equipment inventory
- `booths` - Booth records
- `booth_types` - Booth type definitions
- `booth_assignments` - Booth assignments

#### Financial
- `invoices` - Invoice records
- `invoice_line_items` - Invoice details
- `payments` - Payment records
- `payment_status_options` - Payment status lookup
- `quotes` - Quote records
- `quote_line_items` - Quote details
- `packages` - Package offerings
- `add_ons` - Additional services
- `products` - Product catalog

#### Operations
- `tasks` - Task management
- `core_task_templates` - Task templates
- `contracts` - Contract documents
- `templates` - Document templates
- `communications` - Communication logs
- `attachments` - File attachments
- `notes` - Notes on various entities
- `locations` - Location data

#### Design
- `design_item_types` - Design item type definitions
- `design_statuses` - Design status options

#### Staff
- `staff_roles` - Staff role definitions
- `user_pay_rate_history` - Pay rate tracking
- `user_role_history` - Role change history

#### Settings & Integration
- `tenant_settings` - Tenant-specific settings (stored in tenant DB)
- `user_integrations` - Third-party integrations (QuickBooks, Gmail, etc.)

## Connection Routing

### Tenants Table Schema

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,

  -- Connection information for tenant's data database
  data_source_url TEXT,                    -- Supabase URL or PostgreSQL connection
  data_source_anon_key TEXT,               -- Encrypted anon key
  data_source_service_key TEXT,            -- Encrypted service role key
  data_source_region TEXT,                 -- Database region
  connection_pool_config JSONB,            -- Pool settings
  data_source_notes TEXT,                  -- Admin notes
  tenant_id_in_data_source TEXT,           -- Tenant ID in the data database

  -- Metadata
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### DataSourceManager

The `DataSourceManager` class handles all tenant routing:

```typescript
import { dataSourceManager } from '@/lib/data-sources/manager';

// Get Supabase client for a specific tenant's data database
const tenantDb = await dataSourceManager.getClientForTenant(tenantId, true);

// Query tenant's data
const { data } = await tenantDb
  .from('accounts')
  .select('*')
  .eq('tenant_id', tenantId);
```

## Migration Strategy

### Phase 1: Prepare Application Database ✅
- [x] Add connection string columns to tenants table
- [x] Document table separation

### Phase 2: Create Tenant Data Database Schema
- [ ] Generate SQL schema for tenant data database
- [ ] Apply RLS policies
- [ ] Create indexes

### Phase 3: Implement Routing Layer
- [ ] Create DataSourceManager class
- [ ] Update GenericRepository
- [ ] Add caching layer

### Phase 4: Update Application Code
- [ ] Update API routes to use tenant routing
- [ ] Update hooks to use tenant-specific clients
- [ ] Add connection testing utilities

### Phase 5: Data Migration
- [ ] Migrate existing tenant data to new tenant data DB
- [ ] Update tenant records with connection strings
- [ ] Verify data integrity

### Phase 6: Testing & Rollout
- [ ] Test with sample tenants
- [ ] Load testing
- [ ] Gradual rollout

## Security Considerations

1. **Encryption**: Connection strings must be encrypted at rest
   - Use AWS KMS, HashiCorp Vault, or Supabase Vault
   - Never store plaintext credentials

2. **Connection Pooling**: Limit connections per tenant
   - Prevent resource exhaustion
   - Monitor connection usage

3. **Audit Logging**: Log all data source changes
   - Track who modified connection strings
   - Alert on suspicious changes

4. **RLS Policies**: Enable Row Level Security on tenant data
   - Enforce tenant_id filtering at database level
   - Defense in depth

## Environment Variables

```bash
# Application Database (Main Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-app-db.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Default Tenant Data Database (Shared)
DEFAULT_TENANT_DATA_URL=https://your-tenant-data.supabase.co
DEFAULT_TENANT_DATA_ANON_KEY=eyJhb...
DEFAULT_TENANT_DATA_SERVICE_KEY=eyJhb...

# Encryption Key (for connection string encryption)
ENCRYPTION_KEY=your-32-byte-hex-key
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Security** | Application DB compromise doesn't expose tenant data |
| **Scalability** | Scale tenant data databases independently |
| **Compliance** | Store tenant data in specific regions/jurisdictions |
| **BYOD Support** | Enterprise customers can bring their own database |
| **Performance** | Isolate heavy tenants to dedicated resources |
| **Cost Efficiency** | Share resources for small tenants, dedicated for enterprise |

## Future Enhancements

- [ ] Multi-region support
- [ ] Automatic failover
- [ ] Read replicas for reporting
- [ ] Connection health monitoring
- [ ] Automated backup verification
- [ ] Cost allocation per tenant
