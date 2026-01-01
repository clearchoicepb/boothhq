# CLAUDE.md - AI Assistant Guide for BoothHQ

This document provides comprehensive guidance for AI assistants working with the BoothHQ codebase.

## Project Overview

BoothHQ is a **multi-tenant CRM application** for event/booth rental businesses built with:
- **Next.js 15.5** (App Router with React 18.2)
- **TypeScript 5.9**
- **Supabase** (PostgreSQL + Auth)
- **React Query** (TanStack Query v5) for data fetching
- **Tailwind CSS v4** for styling
- **NextAuth.js v4** for authentication
- **Zod v4** for validation

### External Integrations
- **Stripe** - Payment processing
- **Twilio** - SMS notifications
- **TipTap** - Rich text editing
- **jsPDF** - PDF generation
- **Recharts** - Data visualization
- **Google Maps** - Address autocomplete and geocoding

## Critical Architecture: Dual-Database System

**IMPORTANT**: This application uses a separated database architecture:

### Application Database (Metadata)
Stores only:
- `tenants` - Tenant metadata + encrypted connection strings
- `users` - User authentication
- `audit_log` - System audit trail

### Tenant Data Database(s) (Business Data)
Stores all business data (45+ tables):
- Accounts, Contacts, Leads, Opportunities
- Events, Event Dates, Event Staff
- Equipment, Booths, Inventory
- Invoices, Payments, Quotes, Contracts
- Tasks, Templates, Communications

### Tenant Context Pattern

**Always use `getTenantContext()` in API routes:**

```typescript
import { getTenantContext } from '@/lib/tenant-helpers'

export async function GET(request: NextRequest) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  // CRITICAL: Always use dataSourceTenantId, not tenantId!
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', dataSourceTenantId)

  return NextResponse.json(data)
}
```

## Directory Structure

```
boothhq/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes (65+ endpoints, 9000+ lines)
│   │   │   ├── events/         # Event management APIs
│   │   │   ├── accounts/       # Account APIs
│   │   │   ├── opportunities/  # Opportunity/sales APIs
│   │   │   ├── invoices/       # Invoice APIs
│   │   │   ├── contracts/      # Contract APIs
│   │   │   ├── maintenance/    # Maintenance APIs
│   │   │   ├── workflows/      # Automation workflows
│   │   │   ├── cron/           # Scheduled jobs
│   │   │   ├── public/         # Public-facing APIs (forms, proofs)
│   │   │   └── ...
│   │   ├── [tenant]/           # Tenant-scoped pages
│   │   │   ├── events/         # Events module
│   │   │   ├── accounts/       # Accounts module
│   │   │   ├── opportunities/  # Opportunities/sales pipeline
│   │   │   ├── dashboard/      # Dashboard views (10 sub-pages)
│   │   │   ├── settings/       # Settings (27 sub-pages)
│   │   │   ├── invoices/       # Invoice management
│   │   │   ├── contracts/      # Contract management
│   │   │   ├── inventory/      # Inventory management
│   │   │   └── ...
│   │   ├── auth/               # Authentication pages
│   │   ├── forms/              # Public form submissions
│   │   ├── proof/              # Design proof approvals
│   │   └── logistics/          # Public logistics views
│   ├── components/             # React components (70+ files)
│   │   ├── ui/                 # Reusable UI components (20 components)
│   │   ├── events/             # Event-specific components
│   │   ├── opportunities/      # Opportunity components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── forms/              # Form components
│   │   ├── reports/            # Reporting components
│   │   ├── workflows/          # Workflow/automation components
│   │   └── ...
│   ├── hooks/                  # Custom React hooks (55+ hooks)
│   │   ├── useEvents.ts        # Events data fetching
│   │   ├── useOpportunity.ts   # Opportunity management
│   │   ├── useEventsFilters.ts # Event filtering logic
│   │   ├── useInventoryItemsData.ts # Inventory management
│   │   └── ...
│   ├── lib/                    # Utility libraries (40+ files)
│   │   ├── data-sources/       # DataSourceManager (tenant routing)
│   │   ├── repositories/       # Generic repository pattern
│   │   ├── services/           # Business logic services
│   │   ├── validators/         # Zod validation schemas
│   │   ├── pdf/                # PDF generation utilities
│   │   ├── automation/         # Workflow automation
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── tenant-helpers.ts   # Tenant context utilities
│   │   ├── queryKeys.ts        # React Query key management
│   │   ├── merge-fields.ts     # Template merge field processing
│   │   ├── stripe.ts           # Stripe integration
│   │   ├── email.ts            # Email services
│   │   ├── logger.ts           # Pino logging
│   │   └── supabase-client.ts  # Supabase client setup
│   ├── contexts/               # React contexts
│   │   └── EventDetailContext.tsx
│   └── types/                  # TypeScript type definitions
│       └── database.ts         # Database schema types
├── supabase/
│   └── migrations/             # Database migrations
├── scripts/                    # Utility scripts (80+ scripts)
├── tests/                      # Test files
│   ├── hooks/                  # Hook tests
│   └── lib/                    # Library tests
└── docs/                       # Additional documentation (7 audit docs)
```

## Key Patterns and Conventions

### 1. API Route Pattern

All API routes should follow this structure:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 2. CRUD Helper Functions

Use tenant-helpers for common operations:

```typescript
import {
  insertWithTenantId,
  updateWithTenantId,
  deleteWithTenantId
} from '@/lib/tenant-helpers'

// Create with automatic tenant_id and audit fields
const { data, error } = await insertWithTenantId(
  supabase,
  'events',
  { title: 'New Event', event_type: 'conference' },
  dataSourceTenantId,
  session.user.id  // Adds created_by, updated_by
)

// Update with tenant filter and audit
const { data, error } = await updateWithTenantId(
  supabase,
  'events',
  eventId,
  { title: 'Updated Title' },
  dataSourceTenantId,
  session.user.id  // Adds updated_by
)

// Delete with tenant filter
const { error } = await deleteWithTenantId(
  supabase,
  'events',
  eventId,
  dataSourceTenantId
)
```

### 3. React Query Hooks Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: async () => {
      const response = await fetch('/api/events')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000,     // 5 minutes
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update')
      return response.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() })
    },
  })
}
```

### 4. Query Keys Convention

Use centralized query keys from `@/lib/queryKeys.ts`:

```typescript
import { queryKeys } from '@/lib/queryKeys'

// Events
queryKeys.events.list()              // ['events']
queryKeys.events.detail(eventId)     // ['event-detail', eventId]
queryKeys.events.staff(eventId)      // ['event-staff', eventId]
queryKeys.events.invoices(eventId)   // ['event-invoices', eventId]
queryKeys.events.dates(eventId)      // ['event-dates', eventId]

// Tasks
queryKeys.tasks.list()               // ['tasks']
queryKeys.tasks.detail(taskId)       // ['tasks', taskId]

// Reference data (for dropdowns)
queryKeys.events.references.accounts()      // ['event-references', 'accounts']
queryKeys.events.references.contacts()      // ['event-references', 'contacts']
```

### 5. UI Components

Reusable components are in `src/components/ui/`:
- `Button` - Standard button with variants (default, destructive, outline, ghost, link)
- `Input`, `Textarea`, `Select` - Form inputs
- `Modal` - Dialog/modal windows
- `Card` - Content containers
- `Tabs` - Tabbed interfaces
- `Badge` - Status badges
- `Calendar` - Date picker
- `KPICard` - Dashboard metric cards
- `RichTextEditor` - TipTap-based WYSIWYG editor
- `SearchableSelect` - Autocomplete dropdown
- `ConfirmDialog` - Confirmation dialogs
- `Pagination` - Paginated lists
- `AddressInput` - Google Maps address autocomplete

**Brand color**: `#347dc4` (used for primary buttons)

### 6. TypeScript Types

Database types are in `src/types/database.ts`:

```typescript
import { Tables, Inserts, Updates } from '@/types/database'

// Usage
type Event = Tables<'events'>
type EventInsert = Inserts<'events'>
type EventUpdate = Updates<'events'>
```

### 7. Logging

Use structured logging with Pino:

```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')

log.info({ eventId, action: 'created' }, 'Event created successfully')
log.error({ error, eventId }, 'Failed to create event')
log.debug({ query }, 'Executing query')
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server

# Build & Lint
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Database
npm run db:test          # Test dual-database setup
npm run db:migrate-data  # Migrate data between databases
npm run verify:tenant-id # Verify tenant_id usage in codebase

# Utilities
npm run backfill:coordinates  # Backfill geocoordinates for locations
```

## Testing Conventions

Tests are in `tests/` directory:
- Use Jest + React Testing Library
- Test files: `*.test.ts` or `*.test.tsx`
- Mock data with `createMockEvent()` pattern
- Use `jest.useFakeTimers()` for date-dependent tests

Example test structure:
```typescript
describe('useEventsFilters', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-11-01'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should filter by status', () => {
    // test implementation
  })
})
```

## Environment Variables

Required variables (see `.env.example`):

```bash
# Application Database (Metadata)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Tenant Data Database
DEFAULT_TENANT_DATA_URL=
DEFAULT_TENANT_DATA_ANON_KEY=
DEFAULT_TENANT_DATA_SERVICE_KEY=

# Security
ENCRYPTION_KEY=              # 64-char hex for AES-256 (openssl rand -hex 32)
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Optional - DataSource Manager
DATA_SOURCE_MAX_CLIENTS=50
DATA_SOURCE_ENABLE_METRICS=true
DATA_SOURCE_CONFIG_CACHE_TTL=300000
DATA_SOURCE_CLIENT_CACHE_TTL=3600000

# Optional - Integrations
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENDGRID_API_KEY=
```

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/lib/tenant-helpers.ts` | Tenant context and CRUD helpers |
| `src/lib/data-sources/manager.ts` | DataSourceManager for tenant routing |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/queryKeys.ts` | Centralized React Query keys |
| `src/lib/generic-api-handler.ts` | Generic CRUD handler for APIs |
| `src/lib/merge-fields.ts` | Template merge field processing |
| `src/lib/pdf-generator.ts` | PDF generation for invoices/contracts |
| `src/lib/permissions.ts` | Role-based permissions |
| `src/lib/logger.ts` | Pino structured logging |
| `src/types/database.ts` | Database type definitions |
| `src/contexts/EventDetailContext.tsx` | Event detail page state |

## Common Gotchas

1. **Always use `dataSourceTenantId`** in queries, not `tenantId`
2. **Never hardcode tenant IDs** - always get from context
3. **API routes need authentication** - use `getTenantContext()`
4. **React Query keys must be consistent** - use `queryKeys` helper
5. **Date handling**: Use `date-fns` library for date manipulation
6. **Form validation**: Use Zod schemas from `src/lib/validators/`
7. **Merge fields**: Use `{{field_name}}` syntax in templates
8. **Logging**: Use `createLogger()` instead of `console.log()`

## Module-Specific Notes

### Events Module
- Events have multiple dates (`event_dates` table)
- Event types are categorized (`event_categories`, `event_types`)
- Staff assignments tracked in `event_staff_assignments`
- Core tasks tracked in `event_core_task_completion`
- Logistics info stored in `event_logistics`
- Supports event forms for customer data collection

### Opportunities Module
- Pipeline stages are configurable per tenant (`opportunity_stages`)
- Opportunities can convert to Events
- Line items support products, packages, and custom items
- Kanban board with drag-and-drop (`@dnd-kit/core`)
- Multiple filter views (pipeline, list, owner-based)

### Accounts/Contacts
- Many-to-many relationship via `contact_accounts`
- Contacts can exist without accounts (leads)
- Lead conversion creates account/contact/opportunity

### Invoices & Payments
- Invoice line items link to products, packages, or custom items
- Payment tracking with multiple payment methods
- Stripe integration for online payments
- PDF generation for invoices

### Contracts
- Template-based contract generation
- Merge field support for dynamic content
- Design proof workflow with customer approval
- Digital signature support

### Inventory
- Equipment types and categories
- Inventory items with quantity tracking
- Assignment to events with availability checking
- Maintenance tracking

### Workflows/Automation
- Trigger-based automation rules
- Email and SMS notifications
- Task creation automation

## When Making Changes

1. **Before editing**: Read the file first to understand context
2. **API changes**: Update both route and corresponding hook
3. **Database changes**: Create migration in `supabase/migrations/`
4. **New components**: Follow existing patterns in `src/components/ui/`
5. **Type changes**: Update `src/types/database.ts` if needed
6. **Testing**: Add tests for new functionality in `tests/`
7. **Query invalidation**: Ensure mutations invalidate affected queries

## Documentation References

Located in `docs/` directory:
- `CORE_TASKS_VS_TASKS_AUDIT.md` - Task system architecture
- `DEPARTMENT_TASK_MANAGEMENT_AUDIT.md` - Department task patterns
- `EVENT_STAFFING_MODULE_AUDIT.md` - Staff assignment system
- `GOOGLE_MAPS_INTEGRATION_AUDIT.md` - Maps integration details
- `QUERY_KEY_CONVENTIONS.md` - Query key patterns
- `SUBTASK_IMPLEMENTATION_PLAN.md` - Subtask feature design
- `TENANT_ID_AUDIT.md` - Tenant ID usage patterns

Also check root-level docs:
- `DATABASE_ARCHITECTURE.md` - Detailed database separation docs
- `TESTING_GUIDE.md` - Testing patterns and examples

## Deployment

- Deployed on **Vercel**
- Configuration in `vercel.json`
- Build ignores ESLint/TypeScript errors (temporary)
- Environment variables set in Vercel dashboard

## Recent Changes (as of Jan 2026)

- Legacy features audit and fixes (#229)
- Merge field resolution improvements (#228)
- Schedule A invoice attachment for contracts
- Template duplication and invoice merge fields
- Location merge fields in contracts
- Entity relationship audits
