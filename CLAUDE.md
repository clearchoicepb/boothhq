# CLAUDE.md - AI Assistant Guide for BoothHQ

This document provides comprehensive guidance for AI assistants working with the BoothHQ codebase.

## Project Overview

BoothHQ is a **multi-tenant CRM application** for event/booth rental businesses built with:
- **Next.js 15** (App Router)
- **TypeScript**
- **Supabase** (PostgreSQL + Auth)
- **React Query** (TanStack Query v5) for data fetching
- **Tailwind CSS v4** for styling
- **NextAuth.js** for authentication

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
│   │   ├── api/                # API routes (65+ endpoints)
│   │   │   ├── events/         # Event management APIs
│   │   │   ├── accounts/       # Account APIs
│   │   │   ├── opportunities/  # Opportunity/sales APIs
│   │   │   └── ...
│   │   ├── [tenant]/           # Tenant-scoped pages
│   │   │   ├── events/         # Events module
│   │   │   ├── accounts/       # Accounts module
│   │   │   ├── dashboard/      # Dashboard views
│   │   │   └── ...
│   │   └── auth/               # Authentication pages
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components (Button, Input, Modal, etc.)
│   │   ├── events/             # Event-specific components
│   │   ├── opportunities/      # Opportunity components
│   │   ├── dashboard/          # Dashboard components
│   │   └── ...
│   ├── hooks/                  # Custom React hooks (50+ hooks)
│   │   ├── useEvents.ts        # Events data fetching
│   │   ├── useOpportunity.ts   # Opportunity management
│   │   └── ...
│   ├── lib/                    # Utility libraries
│   │   ├── data-sources/       # DataSourceManager (tenant routing)
│   │   ├── repositories/       # Generic repository pattern
│   │   ├── services/           # Business logic services
│   │   ├── validators/         # Data validation
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── tenant-helpers.ts   # Tenant context utilities
│   │   ├── queryKeys.ts        # React Query key management
│   │   └── supabase-client.ts  # Supabase client setup
│   ├── contexts/               # React contexts
│   └── types/                  # TypeScript type definitions
│       └── database.ts         # Database schema types
├── supabase/
│   └── migrations/             # Database migrations
├── scripts/                    # Utility scripts
├── tests/                      # Test files
└── docs/                       # Additional documentation
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

### 2. React Query Hooks Pattern

```typescript
import { useQuery } from '@tanstack/react-query'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000,     // 5 minutes
  })
}
```

### 3. Query Keys Convention

Use centralized query keys from `@/lib/queryKeys.ts`:

```typescript
import { queryKeys } from '@/lib/queryKeys'

// Examples
queryKeys.events.list()              // ['events']
queryKeys.events.detail(eventId)     // ['event-detail', eventId]
queryKeys.events.staff(eventId)      // ['event-staff', eventId]
```

### 4. UI Components

Reusable components are in `src/components/ui/`:
- `Button` - Standard button with variants (default, destructive, outline, ghost, link)
- `Input`, `Textarea`, `Select` - Form inputs
- `Modal` - Dialog/modal windows
- `Card` - Content containers
- `Tabs` - Tabbed interfaces

**Brand color**: `#347dc4` (used for primary buttons)

### 5. TypeScript Types

Database types are in `src/types/database.ts`:

```typescript
import { Tables, Inserts, Updates } from '@/types/database'

// Usage
type Event = Tables<'events'>
type EventInsert = Inserts<'events'>
type EventUpdate = Updates<'events'>
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
ENCRYPTION_KEY=              # 64-char hex for AES-256
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Optional
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/lib/tenant-helpers.ts` | Tenant context and CRUD helpers |
| `src/lib/data-sources/manager.ts` | DataSourceManager for tenant routing |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/queryKeys.ts` | Centralized React Query keys |
| `src/lib/generic-api-handler.ts` | Generic CRUD handler for APIs |
| `src/types/database.ts` | Database type definitions |

## Common Gotchas

1. **Always use `dataSourceTenantId`** in queries, not `tenantId`
2. **Never hardcode tenant IDs** - always get from context
3. **API routes need authentication** - use `getTenantContext()`
4. **React Query keys must be consistent** - use `queryKeys` helper
5. **Date handling**: Use `date-fns` library for date manipulation
6. **Form validation**: Use Zod schemas from `src/lib/validators/`

## Module-Specific Notes

### Events Module
- Events have multiple dates (`event_dates` table)
- Event types are categorized (`event_categories`, `event_types`)
- Staff assignments tracked in `event_staff_assignments`
- Core tasks tracked in `event_core_task_completion`

### Opportunities Module
- Pipeline stages are configurable per tenant
- Opportunities can convert to Events
- Line items support products, packages, and custom items

### Accounts/Contacts
- Many-to-many relationship via `contact_accounts`
- Contacts can exist without accounts (leads)

## When Making Changes

1. **Before editing**: Read the file first to understand context
2. **API changes**: Update both route and corresponding hook
3. **Database changes**: Create migration in `supabase/migrations/`
4. **New components**: Follow existing patterns in `src/components/ui/`
5. **Type changes**: Update `src/types/database.ts` if needed
6. **Testing**: Add tests for new functionality in `tests/`

## Documentation References

- `DATABASE_ARCHITECTURE.md` - Detailed database separation docs
- `TESTING_GUIDE.md` - Testing patterns and examples
- `MODAL_PATTERN_GUIDE.md` - Modal component patterns
- `EVENTS_MODULE_AUDIT.md` - Events module architecture
- `OPPORTUNITIES_DASHBOARD_ARCHITECTURE.md` - Opportunities module

## Deployment

- Deployed on **Vercel**
- Configuration in `vercel.json`
- Build ignores ESLint/TypeScript errors (temporary)
- Environment variables set in Vercel dashboard
