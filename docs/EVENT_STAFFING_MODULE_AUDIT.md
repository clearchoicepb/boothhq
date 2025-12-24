# Event Staffing Module - Codebase Audit Report

**Date:** 2024-12-24
**Purpose:** Design foundation for new Event Staffing module
**Branch:** `claude/audit-event-staffing-Nk90m`

---

## 1. DATA MODELS

### 1.1 Events Table

**Location:** `src/types/database.ts`, `supabase/migrations/001_complete_schema.sql`

```
events:
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── title (TEXT, required)
├── description (TEXT)
├── status (VARCHAR) - 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
├── start_date (TIMESTAMP WITH TIME ZONE, required)
├── end_date (TIMESTAMP WITH TIME ZONE)
│
├── # Account/Contact References
├── account_id (UUID, FK → accounts)
├── contact_id (UUID, FK → contacts)
├── primary_contact_id (UUID, FK → contacts)
├── event_planner_id (UUID, FK → contacts)  # Note: references contacts, not users!
│
├── # Event Classification
├── event_type (VARCHAR)
├── event_category_id (UUID, FK → event_categories)
├── event_type_id (UUID, FK → event_types)
│
├── # Location
├── location (TEXT)
├── location_id (UUID, FK → locations)
│
├── # Workflow Tracking Booleans
├── staff_assigned (BOOLEAN, default: false)
├── staff_notified (BOOLEAN, default: false)
├── equipment_assigned (BOOLEAN, default: false)
├── venue_confirmed (BOOLEAN, default: false)
└── ...more operational fields
```

**Key Insight:** The `event_planner_id` field references the `contacts` table, NOT the `users` table. This is for external event planners from client organizations.

### 1.2 Event Staff Assignments Table

**Location:** `supabase/migrations/20250208000000_create_event_staff_assignments.sql`

```
event_staff_assignments:
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── event_id (UUID, FK → events, required)
├── user_id (UUID, FK → users, required)
├── event_date_id (UUID, FK → event_dates, nullable)
│   └── NULL = assigned to overall event, not specific date
├── staff_role_id (UUID, FK → staff_roles, nullable)
├── role (VARCHAR(100)) - Custom role description
├── notes (TEXT)
├── start_time (TIME) - Shift start for event_staff
├── end_time (TIME) - Shift end for event_staff
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

UNIQUE(tenant_id, event_id, user_id, event_date_id)
```

**Key Pattern:** Staff are assigned via this junction table, linking users to events with optional date-specific assignments.

### 1.3 Staff Roles Table

**Location:** `supabase/migrations/20250208000005_create_staff_roles.sql`

```
staff_roles:
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── name (VARCHAR(100), required)
├── type (VARCHAR(50)) - 'operations' | 'event_staff'
├── is_active (BOOLEAN, default: false)
├── is_default (BOOLEAN, default: false)
├── sort_order (INTEGER, default: 0)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

UNIQUE(tenant_id, name)
```

**Default Roles Created Per Tenant:**
- **Operations:** "Graphic Designer", "Event Manager"
- **Event Staff:** "Technician", "Event Host", "Brand Ambassador"

**Role Type Distinction:**
- `operations` - Pre-event planning roles (Event Manager, Graphic Designer)
  - Assigned at event level (no specific date/time)
- `event_staff` - Day-of-event roles (Technician, Host, etc.)
  - Assigned to specific event dates with start/end times

### 1.4 Users Table

**Location:** `supabase/migrations/20250920153747_complete_schema_fix.sql` + subsequent migrations

```
users:
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── email (TEXT, unique per tenant)
├── first_name (TEXT)
├── last_name (TEXT)
│
├── # System Role
├── role (TEXT) - 'admin' | 'manager' | 'user'
├── status (TEXT) - 'active' | 'inactive' | 'suspended'
├── is_active (BOOLEAN, default: true)
│
├── # Department Assignment (Multi-Department Support)
├── departments (TEXT[]) - Array of department IDs
├── department (TEXT) - DEPRECATED legacy single department
├── department_role (TEXT) - 'member' | 'supervisor' | 'manager'
├── manager_of_departments (TEXT[]) - Departments where user is manager
│
├── # Other Fields
├── permissions (JSONB, default: {})
├── password_hash (TEXT)
├── last_login (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Indexes:
- idx_users_departments (GIN)
- idx_users_manager_of_departments (GIN)
```

### 1.5 Departments Configuration

**Location:** `src/lib/departments.ts`

```typescript
type DepartmentId =
  | 'sales'
  | 'design'
  | 'operations'
  | 'customer_success'
  | 'accounting'
  | 'admin'
  | 'event_staff'  // Special category for event-only staff

type DepartmentRole = 'member' | 'supervisor' | 'manager'
```

**Key Departments for Event Staffing:**
- `operations` - Operations team (amber color, #f59e0b)
- `design` - Design & Creative (purple, #8b5cf6)
- `event_staff` - Event Staff (teal, #14b8a6)

### 1.6 Event Dates Table (Multi-Day Events)

**Location:** `supabase/migrations/`

```
event_dates:
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── event_id (UUID, FK → events)
├── event_date (DATE, required)
├── start_time (TIME)
├── end_time (TIME)
├── setup_time (TIME)
├── location_id (UUID, FK → locations)
├── notes (TEXT)
├── status (VARCHAR, default: 'scheduled')
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## 2. EXISTING COMPONENTS

### 2.1 Table/List Components

| Component | Location | Key Features |
|-----------|----------|--------------|
| **WeeklyEventsTable** | `src/components/dashboard/weekly-events-table.tsx` | Tab-based week selection, staff grouping by type, task readiness progress bars, PDF export |
| **OpportunityTable** | `src/components/opportunities/opportunity-table.tsx` | Pagination, sorting, inline actions, column filters |
| **InventoryTableView** | `src/components/inventory/inventory-table-view.tsx` | Virtual scrolling (react-virtual), collapsible sections, bulk selection |
| **EventStaffList** | `src/components/events/event-staff-list.tsx` | Collapsible sections (Operations vs Event Staff), inline assignment form |

### 2.2 Dropdown/Select Components

| Component | Location | Use Case |
|-----------|----------|----------|
| **SearchableSelect** | `src/components/ui/searchable-select.tsx` | Core searchable dropdown with keyboard nav, create option |
| **InlineSearchableSelect** | `src/components/ui/inline-searchable-select.tsx` | Compact inline selection with save/cancel |
| **AccountSelect** | `src/components/account-select.tsx` | Account selection with creation modal |
| **ContactSelect** | `src/components/contact-select.tsx` | Contact selection, account-dependent |
| **LeadSelect** | `src/components/lead-select.tsx` | Lead selection with creation |
| **InlineContactSelect** | `src/components/inline-contact-select.tsx` | Quick inline contact assignment |
| **Select** (base) | `src/components/ui/select.tsx` | Native HTML select styled |

### 2.3 Tab Components

**Location:** `src/components/ui/tabs.tsx`

Four sub-components with context-based state:
- `Tabs` - Container with context provider
- `TabsList` - Container for triggers
- `TabsTrigger` - Individual tab button
- `TabsContent` - Content panel per tab

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
    <TabsTrigger value="partial">Partially Assigned</TabsTrigger>
    <TabsTrigger value="all">All Events</TabsTrigger>
  </TabsList>
  <TabsContent value="unassigned">...</TabsContent>
</Tabs>
```

### 2.4 Inline Edit Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **InlineEditField** | `src/components/events/detail/shared/InlineEditField.tsx` | Text input with explicit save |
| **InlineEditSelect** | `src/components/events/detail/shared/InlineEditSelect.tsx` | Dropdown with explicit save |
| **InlineEditTextArea** | `src/components/events/detail/shared/InlineEditTextArea.tsx` | Textarea with char counter |

**Common Pattern:**
- Display mode → Hover shows edit icon → Click opens edit mode
- Explicit Save (✓) / Cancel (✗) buttons
- Keyboard shortcuts: Enter to save, Escape to cancel
- Loading spinner during save

### 2.5 Modal Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Modal** | `src/components/ui/modal.tsx` | Base modal using React Portal |
| **AssignStaffModal** | `src/components/events/assign-staff-modal.tsx` | Staff assignment with role/date selection |

---

## 3. CURRENT ASSIGNMENT LOGIC

### 3.1 Workflow-Based Auto-Assignment

**Core Files:**
- `src/lib/services/workflowEngine.ts` - Workflow orchestration
- `src/lib/services/workflowActionExecutor.ts` - Action execution
- `src/lib/services/workflowTriggerService.ts` - Trigger detection

**Trigger Types:**
- `event_created` - When event is created
- `task_created` - When task is created
- `task_status_changed` - Task status updates
- `event_date_approaching` - X days before event

**Auto-Assignment Action: `assign_event_role`**

```typescript
// From workflowActionExecutor.ts
const { data: assignment } = await supabase
  .from('event_staff_assignments')
  .insert({
    tenant_id: dataSourceTenantId,
    event_id: eventId,
    user_id: action.assigned_to_user_id,
    staff_role_id: action.staff_role_id,
    event_date_id: null,  // Operations roles = event level
  })
```

**Current Limitation:** No round-robin or load-balancing. Workflows require explicit user_id assignment.

### 3.2 Event Manager Assignment

Event Managers are assigned via:
1. **Workflow automation** - `assign_event_role` action triggered on `event_created`
2. **Manual assignment** - Via `AssignStaffModal` component

The "Event Manager" role is created as default with type `operations`.

### 3.3 Graphic Designer Assignment

Similar to Event Manager:
1. **Workflow automation** on event creation
2. **Manual assignment** via modal

Also tracked in `event_design_items.assigned_designer_id` for specific design tasks.

### 3.4 Event Staff Manual Assignment

**Location:** `src/components/events/event-staff-list.tsx`

Manual assignment through:
- Select user from dropdown
- Select staff role (event_staff type)
- Optionally assign to specific event date
- Set shift start/end times
- Add notes

---

## 4. API PATTERNS

### 4.1 Tenant Context Pattern

**Location:** `src/lib/tenant-helpers.ts`

```typescript
import { getTenantContext } from '@/lib/tenant-helpers'

export async function GET(request: NextRequest) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  // CRITICAL: Always use dataSourceTenantId in queries!
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', dataSourceTenantId)

  return NextResponse.json(data)
}
```

### 4.2 Event API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/events` | GET | List events with filters |
| `/api/events` | POST | Create event |
| `/api/events/[id]` | GET | Event detail with staff, tasks |
| `/api/events/[id]` | PUT | Update event fields |
| `/api/events/[id]` | DELETE | Delete event |
| `/api/events/tasks-status` | GET | Task completion status |

### 4.3 Staff API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/event-staff` | GET | List staff for event (by event_id) |
| `/api/event-staff` | POST | Assign staff to event |
| `/api/event-staff/[id]` | PUT | Update assignment |
| `/api/event-staff/[id]` | DELETE | Remove assignment |
| `/api/staff-roles` | GET | List staff roles |
| `/api/users` | GET | List all users in tenant |

### 4.4 Staff Assignment Request/Response

**POST /api/event-staff**
```typescript
// Request
{
  event_id: string,
  user_id: string,
  staff_role_id: string | null,
  event_date_id: string | null,
  notes: string | null,
  start_time: string | null,  // HH:mm format
  end_time: string | null
}

// Response
{
  id: string,
  user_id: string,
  event_id: string,
  staff_role_id: string | null,
  users: { id, first_name, last_name, email },
  staff_roles: { id, name, type },
  event_dates: { id, event_date, start_time, end_time } | null
}
```

### 4.5 React Query Hooks

| Hook | Endpoint | Cache |
|------|----------|-------|
| `useEvents()` | GET /api/events | 30s stale, 5m gc |
| `useEventDetail(id)` | GET /api/events/[id] | 30s stale |
| `useEventStaffData(eventId)` | GET /api/event-staff | 30s stale |
| `useAddEventStaff(eventId)` | POST /api/event-staff | mutation |
| `useUpdateEventStaff(eventId)` | PUT /api/event-staff/[id] | mutation |
| `useRemoveEventStaff(eventId)` | DELETE /api/event-staff/[id] | mutation |
| `useUsers()` | GET /api/users | 5m stale, 10m gc |
| `useStaffRoles(activeOnly)` | GET /api/staff-roles | 5m stale |

---

## 5. FILE LOCATIONS

### 5.1 Database Types/Schemas

| File | Content |
|------|---------|
| `src/types/database.ts` | Generated TypeScript types for all tables |
| `supabase/migrations/001_complete_schema.sql` | Base schema |
| `supabase/migrations/20250208000000_create_event_staff_assignments.sql` | Staff assignments table |
| `supabase/migrations/20250208000005_create_staff_roles.sql` | Staff roles + default data |
| `supabase/migrations/20251206134718_add_departments_array_to_users.sql` | Multi-department support |

### 5.2 User/Employee Schemas

| File | Content |
|------|---------|
| `src/lib/departments.ts` | Department definitions, types, utilities |
| `src/lib/roles.ts` | System role definitions |
| `src/lib/users.ts` | User utility functions |
| `supabase/migrations/20251101000000_add_department_to_users_and_tasks.sql` | Department fields |
| `supabase/migrations/20251119020000_add_manager_of_departments.sql` | Manager tracking |

### 5.3 Events Components

| File | Content |
|------|---------|
| `src/components/events/event-staff-list.tsx` | Staff display & management |
| `src/components/events/assign-staff-modal.tsx` | Assignment modal |
| `src/components/dashboard/weekly-events-table.tsx` | Dashboard events table |
| `src/app/[tenant]/events/page.tsx` | Events list page |
| `src/app/[tenant]/events/[id]/page.tsx` | Event detail page |

### 5.4 Staff Assignment Components

| File | Content |
|------|---------|
| `src/components/events/event-staff-list.tsx` | Main staff list with Operations/Event Staff sections |
| `src/components/events/assign-staff-modal.tsx` | Modal for selecting user, role, date |
| `src/hooks/useEventStaff.ts` | Staff CRUD operations |
| `src/hooks/useEventStaffData.ts` | Staff data fetching |

### 5.5 Workflow Files

| File | Content |
|------|---------|
| `src/lib/services/workflowEngine.ts` | Workflow execution engine |
| `src/lib/services/workflowActionExecutor.ts` | Action handlers including `assign_event_role` |
| `src/lib/services/workflowTriggerService.ts` | Trigger detection |
| `src/types/workflows.ts` | Workflow type definitions |
| `src/app/[tenant]/settings/workflows/page.tsx` | Workflow management UI |

---

## 6. DESIGN RECOMMENDATIONS

### 6.1 Suggested UI Structure

```
Event Staffing Module
├── Tabs: [Needs Event Manager] [Needs Designer] [Needs Event Staff] [All Events]
├── Filters: Date range, Event Type, Location
└── Table:
    ├── Event Name (link to detail)
    ├── Date(s)
    ├── Event Type
    ├── Event Manager [Dropdown]
    ├── Graphic Designer [Dropdown]
    ├── Event Staff Count [Badge + Expand]
    └── Status [Badge]
```

### 6.2 Recommended Components to Reuse

1. **Tabs** - For filtering by assignment status
2. **SearchableSelect** or **InlineSearchableSelect** - For quick staff assignment dropdowns
3. **WeeklyEventsTable** patterns - Staff grouping, collapsible sections
4. **InlineEditSelect** - For in-place dropdown editing

### 6.3 Potential New API Endpoint

```typescript
// GET /api/events/staffing
// Returns events with staff assignment status

interface EventStaffingView {
  id: string
  title: string
  event_dates: EventDate[]
  event_type: string
  status: string

  // Staff assignment status
  event_manager: User | null
  graphic_designer: User | null
  event_staff_count: number
  needs_event_manager: boolean
  needs_designer: boolean
  needs_event_staff: boolean
}
```

### 6.4 Filtering Users by Role

To show only eligible staff in dropdowns:

```typescript
// Filter by department
const operationsStaff = users.filter(u =>
  u.departments?.includes('operations')
)

// Filter by staff role type
const eventStaffUsers = users.filter(u =>
  u.departments?.includes('event_staff')
)
```

---

## 7. KEY CONSTRAINTS & CONSIDERATIONS

1. **Staff Assignment Uniqueness:** `(tenant_id, event_id, user_id, event_date_id)` must be unique

2. **Operations vs Event Staff:**
   - Operations roles (Event Manager, Designer) = event-level assignment (no date/time)
   - Event Staff roles = date-specific with shift times

3. **Multi-Day Events:** Events can have multiple `event_dates`, each with potentially different staff

4. **Tenant Isolation:** Always use `dataSourceTenantId` in queries

5. **No Load Balancing:** Current workflow system requires explicit user assignment

---

## 8. QUICK REFERENCE

### Database Query Examples

```sql
-- Events needing Event Manager
SELECT e.* FROM events e
WHERE e.tenant_id = :tenantId
AND NOT EXISTS (
  SELECT 1 FROM event_staff_assignments esa
  JOIN staff_roles sr ON esa.staff_role_id = sr.id
  WHERE esa.event_id = e.id
  AND sr.name = 'Event Manager'
);

-- Events needing Graphic Designer
SELECT e.* FROM events e
WHERE e.tenant_id = :tenantId
AND NOT EXISTS (
  SELECT 1 FROM event_staff_assignments esa
  JOIN staff_roles sr ON esa.staff_role_id = sr.id
  WHERE esa.event_id = e.id
  AND sr.name = 'Graphic Designer'
);

-- Staff available in Operations department
SELECT * FROM users
WHERE tenant_id = :tenantId
AND status = 'active'
AND 'operations' = ANY(departments);
```

### TypeScript Type Helpers

```typescript
import { Tables, Inserts, Updates } from '@/types/database'

type Event = Tables<'events'>
type EventStaffAssignment = Tables<'event_staff_assignments'>
type StaffRole = Tables<'staff_roles'>
type User = Tables<'users'>
```

---

*Report generated for Event Staffing module design. For questions, reference the source files listed in Section 5.*
