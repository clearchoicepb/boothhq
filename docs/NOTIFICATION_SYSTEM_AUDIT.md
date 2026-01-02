# Notification System Audit

**Date:** 2026-01-02
**Purpose:** Audit codebase to understand architecture and identify integration points for implementing a user notification system.

## Executive Summary

This audit analyzed the BoothHQ codebase to identify where notifications should be triggered and how they should integrate with existing patterns. The system uses a dual-database architecture with multi-tenant support, NextAuth.js for authentication, and React Query for data fetching.

Key findings:
- No existing user notification system
- Existing `inventory_notifications` table provides a pattern reference
- No real-time subscriptions currently in use (polling recommended to start)
- Clear integration points identified for 5 notification triggers
- TopNav component is the ideal location for notification UI

---

## Database Schema Analysis

### Users Table
**Location:** Tenant Data Database

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| email | TEXT | User email |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| role | TEXT | admin, manager, user |
| status | TEXT | active, inactive, suspended |
| department | TEXT | Primary department |
| department_role | TEXT | member, supervisor, manager |
| departments | TEXT[] | Array of all departments |
| manager_of_departments | TEXT[] | Departments user manages |

### Tasks Table
**Location:** Tenant Data Database

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| title | VARCHAR(255) | Task title |
| assigned_to | UUID | FK to users |
| created_by | UUID | FK to users |
| entity_type | VARCHAR(50) | 'event', 'opportunity', etc. |
| entity_id | UUID | Related entity ID |
| status | VARCHAR(50) | pending, in_progress, completed, cancelled, awaiting_approval, approved, needs_revision |
| parent_task_id | UUID | Self-reference for subtasks |
| display_order | INTEGER | Ordering within parent |
| department | TEXT | Responsible department |
| task_type | TEXT | Task classification |

### Tickets Table
**Location:** Tenant Data Database

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| title | VARCHAR(255) | Ticket title |
| description | TEXT | Ticket details |
| ticket_type | VARCHAR(50) | bug, feature, question, improvement, other |
| priority | VARCHAR(20) | low, medium, high, urgent |
| status | VARCHAR(50) | new, in_progress, resolved, closed, on_hold |
| reported_by | UUID | FK to users (creator) |
| assigned_to | UUID | FK to users |
| resolved_by | UUID | FK to users |
| resolved_at | TIMESTAMPTZ | Resolution timestamp |
| resolution_notes | TEXT | Resolution details |

### Design Proofs Table
**Location:** Tenant Data Database

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| event_id | UUID | FK to events |
| uploaded_by | UUID | FK to users (designer) |
| file_name | TEXT | Original filename |
| storage_path | TEXT | Supabase Storage path |
| public_token | VARCHAR(64) | Token for public access |
| status | VARCHAR(50) | pending, approved, rejected |
| responded_at | TIMESTAMPTZ | Client response time |
| client_name | VARCHAR(255) | Who approved/rejected |
| client_notes | TEXT | Feedback (required for rejection) |

### Event Staff Assignments Table
**Location:** Tenant Data Database

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| event_id | UUID | FK to events |
| user_id | UUID | FK to users |
| event_date_id | UUID | FK to event_dates (optional) |
| role | VARCHAR(100) | Role description |
| notes | TEXT | Assignment notes |

### Existing Triggers
- `update_updated_at_column()` - Updates `updated_at` on all tables
- `audit_trigger_function()` - Logs changes to `audit_log` table
- `enforce_single_level_subtasks()` - Prevents nested subtasks
- **No notification-related triggers exist**

---

## Integration Points

### 1. Design/Logistics Form Completion

**File:** `src/app/api/public/forms/[publicId]/route.ts`
**Function:** `POST` handler (lines 174-271)
**Trigger Point:** Lines 224-229

```typescript
// Current code:
const { error: updateError } = await supabase
  .from('event_forms')
  .update({
    responses: formResponses,
    status: 'completed',
    completed_at: new Date().toISOString(),
  })
  .eq('id', form.id)

// Add notification after this update
```

**Notification Details:**
- Type: `form_completed`
- Recipient: Task assignee for related event (need to lookup via event_id -> tasks)
- Message: "{form.name} has been completed for {event.title}"

### 2. Design Proof Approval/Rejection

**File:** `src/app/api/public/design-proofs/[token]/respond/route.ts`
**Function:** `POST` handler (lines 27-132)
**Trigger Point:** Lines 95-105

```typescript
// Current code:
const { data: updatedProof, error: updateError } = await supabase
  .from('design_proofs')
  .update({
    status,
    client_name: clientName.trim(),
    client_notes: notes?.trim() || null,
    responded_at: new Date().toISOString(),
  })
  .eq('public_token', token)

// Add notification after this update
```

**Notification Details:**
- Type: `proof_approved` or `proof_rejected`
- Recipient: `uploaded_by` user (the designer)
- Message: "Your design proof for {event.title} has been {approved/rejected}"

### 3. Task/Subtask Completion

**File:** `src/app/api/tasks/[id]/route.ts`
**Function:** `PATCH` handler (lines 94-298)
**Trigger Point:** Lines 206-235 (status change handling)

```typescript
// Current code (line 210):
if ((status === 'completed' || status === 'approved') && !updateData.completed_at) {
  updateData.completed_at = new Date().toISOString()
}

// Existing workflow trigger (line 275-292) - can be extended for notifications
```

**Notification Details for Subtasks:**
- Type: `subtask_completed`
- Recipient: Parent task's `assigned_to` user
- Message: "Subtask '{subtask.title}' has been completed"
- Logic: Check if `parent_task_id` exists, then notify parent task owner

### 4. Ticket Resolution

**File:** `src/app/api/tickets/[id]/route.ts`
**Function:** `PUT` handler (lines 72-131)
**Trigger Point:** Lines 88-99

```typescript
// Current code:
if (body.status === 'resolved' && !body.resolved_at) {
  body.resolved_at = new Date().toISOString()
}

// Add notification after successful update
```

**Notification Details:**
- Type: `ticket_resolved`
- Recipient: `reported_by` user (ticket creator)
- Message: "Your ticket '{ticket.title}' has been resolved"

---

## Real-time Infrastructure

### Current State
- **NO** Supabase Realtime subscriptions in use
- **NO** WebSocket implementations
- **NO** polling mechanisms for notifications
- Only 2 files reference "subscribe" (unrelated settings pages)

### Recommendations

**Option 1: Polling (Recommended Start)**
```typescript
// In useUnreadCount hook
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count')
      return res.json()
    },
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000,
  })
}
```

**Option 2: Supabase Realtime (Enhancement)**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        queryClient.invalidateQueries(['notifications'])
        toast.success(payload.new.title)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

---

## UI/Layout Structure

### Notification Bell Placement

**File:** `src/components/layout/top-nav.tsx`
**Location:** Between Global Search and User Avatar (around line 218)

```tsx
{/* Global Search */}
<div className="hidden md:flex flex-1 max-w-[400px] ...">
  <GlobalSearch tenantSubdomain={tenantSubdomain} />
</div>

{/* ADD NOTIFICATION BELL HERE */}
<NotificationBell />

{session && (
  <div className="relative flex-shrink-0" ref={userMenuRef}>
    {/* User menu */}
  </div>
)}
```

### Existing UI Patterns

**Dropdown Pattern (from user menu):**
```tsx
const [isOpen, setIsOpen] = useState(false)
const ref = useRef<HTMLDivElement>(null)

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])

return (
  <div className="relative" ref={ref}>
    <button onClick={() => setIsOpen(!isOpen)}>...</button>
    {isOpen && (
      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg ...">
        ...
      </div>
    )}
  </div>
)
```

### Available UI Components
- `Badge` - for unread count indicator
- `Modal` - for full notification view
- `Button` - for actions
- Icons: `lucide-react` (use `Bell`, `BellDot`)
- Brand color: `#347dc4`

---

## User Context Access

### Server-Side (API Routes)
```typescript
import { getTenantContext } from '@/lib/tenant-helpers'

export async function POST(request: NextRequest) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { session, supabase, dataSourceTenantId } = context

  // Access current user
  const userId = session.user.id
  const userEmail = session.user.email
  const userName = session.user.name
  const tenantId = dataSourceTenantId  // Use for DB queries
}
```

### Client-Side (Components)
```typescript
// Option 1: NextAuth session (recommended)
import { useSession } from 'next-auth/react'

function Component() {
  const { data: session } = useSession()
  const userId = session?.user?.id
}

// Option 2: Tenant context
import { useTenant } from '@/lib/tenant-context'

function Component() {
  const { currentUser } = useTenant()
  const userId = currentUser?.id
}
```

---

## Recommended Notification Schema

```sql
-- Migration: Create user notifications system
-- Run this in TENANT DATA database

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related entity (polymorphic)
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Navigation link
  link_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Actor who triggered notification
  actor_name VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_user_notifications_user_unread
  ON user_notifications(user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX idx_user_notifications_tenant_user
  ON user_notifications(tenant_id, user_id);

CREATE INDEX idx_user_notifications_created
  ON user_notifications(created_at DESC);

-- Trigger for cleanup (optional - delete old read notifications)
-- Can be added later if needed
```

### Notification Types
| Type | Trigger | Recipient |
|------|---------|-----------|
| `form_completed` | Form submission | Event task assignee |
| `proof_approved` | Client approves proof | Designer (uploaded_by) |
| `proof_rejected` | Client rejects proof | Designer (uploaded_by) |
| `subtask_completed` | Subtask marked complete | Parent task owner |
| `ticket_resolved` | Ticket resolved | Ticket creator |

---

## Files to Modify

### Existing Files
| File | Change |
|------|--------|
| `src/app/api/public/forms/[publicId]/route.ts` | Add notification on completion |
| `src/app/api/public/design-proofs/[token]/respond/route.ts` | Add notification on response |
| `src/app/api/tasks/[id]/route.ts` | Add notification on subtask completion |
| `src/app/api/tickets/[id]/route.ts` | Add notification on resolution |
| `src/components/layout/top-nav.tsx` | Add notification bell component |
| `src/lib/queryKeys.ts` | Add notification query keys |

### New Files to Create
| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_create_user_notifications.sql` | Database schema |
| `src/app/api/notifications/route.ts` | GET list, POST mark all read |
| `src/app/api/notifications/[id]/route.ts` | PATCH mark single as read |
| `src/app/api/notifications/unread-count/route.ts` | Quick count for badge |
| `src/components/notifications/NotificationBell.tsx` | Bell icon with dropdown |
| `src/components/notifications/NotificationDropdown.tsx` | Dropdown content |
| `src/components/notifications/NotificationItem.tsx` | Single notification |
| `src/hooks/useNotifications.ts` | Fetch and manage notifications |
| `src/lib/services/notificationService.ts` | Server-side notification creation |

---

## Future Enhancements

### Additional Notification Types to Consider
- **payment_received** - When invoice payment is recorded
- **event_status_change** - When event moves to confirmed/completed
- **task_assigned** - When a task is assigned to you
- **task_overdue** - When your task passes due date
- **staff_assigned** - When assigned to an event
- **mention** - When mentioned in a note or comment

### Email Notifications
- Add `email_sent` boolean to notification table
- Create background job to send emails for unread notifications
- Respect user preferences (add to user settings)

### Push Notifications
- Add service worker for PWA support
- Integrate with browser notification API
- Store push subscription in user table
