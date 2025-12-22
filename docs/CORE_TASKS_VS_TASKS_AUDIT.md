# Core Tasks vs Tasks System Audit

**Date:** December 22, 2025
**Status:** Complete

---

## Executive Summary

BoothHQ has two distinct task-related systems that serve fundamentally different purposes:

| System | Purpose | Complexity |
|--------|---------|------------|
| **Core Tasks** | Event readiness checklist | Simple binary checklist |
| **Tasks** | Full work item management | Rich task management system |

**Recommendation:** These systems should **NOT** be consolidated. They serve complementary purposes and the current architecture is sound.

---

## 1. Core Tasks System

### Purpose
A lightweight, tenant-customizable event readiness checklist that tracks essential pre-event milestones. Think of it as a "flight checklist" for events.

### Database Schema

#### `core_task_templates` Table
```sql
- id: UUID (PK)
- tenant_id: UUID (FK to tenants)
- task_name: VARCHAR(255)
- display_order: INTEGER
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

#### `event_core_task_completion` Table
```sql
- id: UUID (PK)
- tenant_id: UUID (FK to tenants)
- event_id: UUID (FK to events)
- core_task_template_id: UUID (FK to core_task_templates)
- is_completed: BOOLEAN
- completed_at: TIMESTAMP
- completed_by: UUID (FK to users)
- created_at, updated_at: TIMESTAMP
```

### Default Core Tasks (seeded per tenant)
1. Photo Strip Design Approval
2. Event Staff Assigned
3. Event Logistics Received
4. Event Setup in Software
5. Payment Received

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/core-task-templates` | GET, POST, PATCH | Manage templates (admin) |
| `/api/core-tasks/templates` | GET | Fetch templates with count |
| `/api/events/[id]/core-tasks` | GET, PATCH | Get/update event completion |
| `/api/events/[id]/core-tasks/initialize` | POST | Initialize tasks for event |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `EventCoreTasksChecklist` | `src/components/event-core-tasks-checklist.tsx` | Interactive checklist UI |
| `CoreTasksBanner` | `src/components/events/core-tasks-banner.tsx` | Dismissible progress banner |
| `EventInlineTasks` | `src/components/events/event-inline-tasks.tsx` | Compact inline display |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCoreTaskTemplates` | `src/hooks/useCoreTaskTemplates.ts` | Fetch templates |

### UI Locations

1. **Event Planning Tab** - "Core Tasks Checklist" section (`src/components/events/detail/tabs/EventPlanningTab.tsx:59-87`)
2. **Event Detail Page** - Banner at top showing progress
3. **Event Timeline View** - Progress indicators on event cards
4. **Settings > Core Tasks** - Admin page for managing templates

### Key Characteristics
- **Auto-initializes** via database trigger when events are created
- **Binary completion** - each task is either done or not done
- **No assignment** - tasks are event-level, not assigned to specific users
- **No due dates** - completion is not time-bound
- **Simple tracking** - just `completed_at` and `completed_by`

---

## 2. Tasks System

### Purpose
A comprehensive work item management system that supports multiple task types, rich workflows, user assignment, due dates, priorities, approval processes, and cross-entity relationships.

### Database Schema

#### `tasks` Table (70+ fields)
```sql
-- Core fields
- id, tenant_id, title, description
- assigned_to, created_by
- status, priority, due_date, completed_at
- department, task_type

-- Entity linking (polymorphic)
- entity_type: 'opportunity' | 'account' | 'contact' | 'lead' | 'invoice' | 'event' | 'project'
- entity_id: UUID
- event_date_id: UUID (specific event date linkage)
- project_id: UUID (direct FK for projects)

-- Design-specific fields
- quantity, revision_count
- design_file_urls[], proof_file_urls[], final_file_urls[]
- client_notes, internal_notes
- design_deadline, design_start_date
- product_id

-- Approval workflow
- requires_approval, approved_by, approval_notes
- submitted_for_approval_at, approved_at

-- Timeline tracking
- assigned_at, started_at

-- Workflow automation
- auto_created, workflow_id, workflow_execution_id
- task_template_id
```

#### `task_templates` Table
```sql
- id, tenant_id, name, description
- department, task_type
- default_title, default_description, default_priority
- default_due_in_days
- days_before_event, days_after_booking
- requires_approval, default_quantity
- display_order, icon, color, category
- enabled, is_active
```

### Task Types
- `general` - Generic tasks
- `design` - Design work with approval workflow
- `operations` - Operational tasks
- `sales` - Sales-related tasks
- `admin` - Administrative tasks
- `project` - Project-specific tasks
- `misc` - Miscellaneous

### Task Statuses
- `pending` - Not started
- `in_progress` - Being worked on
- `awaiting_approval` - Submitted for review
- `needs_revision` - Requires changes
- `approved` - Approved (for design tasks)
- `completed` - Done
- `cancelled` - Cancelled

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/tasks` | GET, POST | List/create tasks with filters |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Single task operations |
| `/api/tasks/from-template` | POST | Create from template |
| `/api/tasks/dashboard` | GET | Department dashboard + stats |
| `/api/tasks/my-tasks` | GET | Current user's tasks |
| `/api/tasks/by-type/[type]` | GET, POST | Tasks by type |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `CreateTaskModal` | `src/components/create-task-modal.tsx` | Create new task |
| `TaskDetailModal` | `src/components/task-detail-modal.tsx` | View/edit task |
| `TasksSection` | `src/components/tasks-section.tsx` | Task list for entities |
| `UnifiedTaskDashboard` | `src/components/dashboards/unified-task-dashboard.tsx` | Department dashboard |
| `MyTasksDashboard` | `src/components/dashboards/my-tasks-dashboard.tsx` | Personal task view |
| `DesignDashboard` | `src/components/dashboards/design-dashboard.tsx` | Design-specific |
| `AddTaskModal` | `src/components/dashboards/add-task-modal.tsx` | Quick-add modal |
| `TaskTemplateForm` | `src/components/task-templates/task-template-form.tsx` | Template editor |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTasks` | `src/hooks/useTaskData.ts` | Fetch tasks with filters |
| `useTask` | `src/hooks/useTaskData.ts` | Single task |
| `useDepartmentTasks` | `src/hooks/useTaskData.ts` | Department tasks |
| `useUserTasks` | `src/hooks/useTaskData.ts` | User's tasks |
| `useEntityTasks` | `src/hooks/useTaskData.ts` | Tasks for entity |
| `useTaskDashboard` | `src/hooks/useTaskDashboard.ts` | Dashboard data |
| `useMyTasks` | `src/hooks/useTaskDashboard.ts` | My Tasks views |
| `useCreateTask` | `src/hooks/useTaskActions.ts` | Create mutation |
| `useUpdateTask` | `src/hooks/useTaskActions.ts` | Update mutation |
| `useTaskActions` | `src/hooks/useTaskActions.ts` | All mutations |
| `useTaskTemplates` | `src/hooks/useTaskTemplates.ts` | Templates |

### Services

| Service | File | Purpose |
|---------|------|---------|
| `TasksService` | `src/lib/api/services/tasksService.ts` | Main CRUD operations |
| `TaskTemplateService` | `src/lib/api/services/taskTemplateService.ts` | Template operations |

### UI Locations

1. **My Tasks Module** - Personal task dashboard (`/[tenant]/tasks/my-tasks`)
2. **Department Dashboards** - Design, Operations, etc.
3. **Event Planning Tab** - "Tasks & To-Dos" section
4. **Opportunity Detail** - Tasks tab
5. **Any Entity Page** - TasksSection component for linked tasks

### Key Characteristics
- **Full assignment** - Tasks assigned to specific users
- **Due dates & priorities** - Time-sensitive with urgency tracking
- **Rich statuses** - 7 status values including approval workflow
- **Department-based** - Organized by department for workload management
- **Cross-entity** - Links to events, opportunities, accounts, contacts, leads, invoices, projects
- **Templates** - Pre-configured templates for quick creation
- **Design workflow** - Special fields for design tasks with approval process
- **Statistics** - Dashboard with KPIs (overdue, today, this week, etc.)

---

## 3. Comparison

### Field/Functionality Overlap

| Feature | Core Tasks | Tasks |
|---------|------------|-------|
| Task name/title | `task_name` | `title` |
| Completion tracking | `is_completed` | `status = 'completed'` |
| Who completed | `completed_by` | `completed_at` + audit |
| When completed | `completed_at` | `completed_at` |
| Tenant isolation | `tenant_id` | `tenant_id` |
| Event relationship | Direct FK | Polymorphic (`entity_type='event'`) |

### Unique to Core Tasks
- Auto-initialization via database trigger
- Simple binary completion (no partial states)
- Display order for consistent UI
- Event-level (not date-level)
- No user assignment
- No due dates
- "Ready for event" aggregate status

### Unique to Tasks
- User assignment (`assigned_to`)
- Due dates with urgency calculation
- Multiple statuses (7 values)
- Priority levels (low, medium, high, urgent)
- Task types (general, design, operations, sales, admin, project, misc)
- Department organization
- Approval workflow (awaiting_approval, needs_revision, approved)
- Design-specific fields (files, quantities, revisions)
- Polymorphic entity linking (7 entity types)
- Templates with calculated due dates
- Comments and history tracking
- Dashboard statistics
- My Tasks personal view

### Where Both Are Used Together

**Event Planning Tab** (`src/components/events/detail/tabs/EventPlanningTab.tsx`)

The Event Planning Tab displays BOTH systems side-by-side:

1. **"Core Tasks Checklist"** section (lines 59-87)
   - Uses `EventCoreTasksChecklist` component
   - Shows event readiness milestones
   - Simple checkbox UI

2. **"Tasks & To-Dos"** section (lines 181-222)
   - Uses `TasksSection` component with `entityType="event"`
   - Shows assigned work items for the event
   - Full task management UI

This dual display makes sense because:
- Core Tasks = "Is this event ready?" (milestone checklist)
- Tasks = "What work needs to be done?" (action items)

---

## 4. Analysis

### Which System is More Fully Built Out?

**Tasks** is significantly more comprehensive:
- 70+ fields vs 6 fields
- 7 API routes vs 4 API routes
- 15+ components vs 3 components
- 10+ hooks vs 1 hook
- 2 services vs none
- Full CRUD + bulk operations
- Dashboard with statistics
- Template system
- Approval workflow

However, **Core Tasks** is appropriately simple for its purpose. Event readiness doesn't need assignment, due dates, or complex workflows.

### Are There Any Redundancies?

**No significant redundancies.** While both track "tasks" conceptually, they serve distinct purposes:

- Core Tasks: "Has this milestone been achieved?" (binary yes/no)
- Tasks: "What work item needs to be completed?" (full lifecycle)

The only potential overlap is when someone creates a Task linked to an event that conceptually duplicates a Core Task (e.g., creating a "Assign staff" task when "Event Staff Assigned" core task exists). This is user behavior, not system redundancy.

---

## 5. Recommendation

### Should These Be Consolidated?

**No.** Consolidation would be counterproductive because:

1. **Different Mental Models**
   - Core Tasks = Status indicators / Milestones
   - Tasks = Work items / Action items

2. **Different Lifecycle**
   - Core Tasks: Created once per event, never deleted
   - Tasks: Created/completed/deleted throughout event lifecycle

3. **Different Ownership**
   - Core Tasks: Event-level, collective responsibility
   - Tasks: Individual assignment with accountability

4. **Simplicity Matters**
   - Core Tasks UI is intentionally simple (5 checkboxes)
   - Forcing it into the Tasks model would add unnecessary complexity

5. **Auto-initialization**
   - Core Tasks auto-create via database trigger
   - Tasks are created manually or via workflow

### What Would Break If Consolidated?

1. Database trigger for auto-initialization
2. Simple checkbox UI in Event Planning Tab
3. "Ready for Event" aggregate status
4. Event timeline progress indicators
5. Core Tasks settings page simplicity

### Alternative Improvements (If Desired)

If you want to reduce confusion without consolidating:

1. **Rename Core Tasks** to "Event Milestones" or "Event Readiness Checklist"
   - Makes the distinction clearer in UI
   - Files: Update `task_name` labels and component text

2. **Add Documentation**
   - Tooltip in Event Planning Tab explaining each section
   - Help text in Settings > Core Tasks

3. **Consider Migration** (low priority)
   - Could migrate Core Tasks to be a special `task_type` in Tasks
   - Would require: new task type, auto-init logic, simplified UI mode
   - Not recommended due to complexity vs benefit ratio

---

## 6. File Reference Summary

### Core Tasks System Files

```
Database:
- supabase/migrations/20250212000001_create_core_tasks_system.sql
- supabase/migrations/20250212000002_backfill_core_tasks_for_existing_events.sql

Types:
- src/types/events.ts (TaskCompletion, CoreTask interfaces)
- src/types/api-responses.ts (CoreTaskTemplateRef, EventCoreTaskCompletion)

API:
- src/app/api/core-task-templates/route.ts
- src/app/api/core-tasks/templates/route.ts
- src/app/api/events/[id]/core-tasks/route.ts
- src/app/api/events/[id]/core-tasks/initialize/route.ts

Components:
- src/components/event-core-tasks-checklist.tsx
- src/components/events/core-tasks-banner.tsx
- src/components/events/event-inline-tasks.tsx

Hooks:
- src/hooks/useCoreTaskTemplates.ts

Pages:
- src/app/[tenant]/settings/core-tasks/page.tsx
```

### Tasks System Files

```
Database:
- supabase/migrations/20250205000000_create_tasks.sql
- supabase/migrations/20251102000000_create_task_templates.sql
- supabase/migrations/20251217000000_expand_tasks_for_unified_model.sql
- (+ 10 additional migrations)

Types:
- src/types/tasks.ts

API:
- src/app/api/tasks/route.ts
- src/app/api/tasks/[id]/route.ts
- src/app/api/tasks/from-template/route.ts
- src/app/api/tasks/dashboard/route.ts
- src/app/api/tasks/my-tasks/route.ts
- src/app/api/tasks/by-type/[type]/route.ts

Services:
- src/lib/api/services/tasksService.ts
- src/lib/api/services/taskTemplateService.ts

Components:
- src/components/create-task-modal.tsx
- src/components/task-detail-modal.tsx
- src/components/tasks-section.tsx
- src/components/dashboards/unified-task-dashboard.tsx
- src/components/dashboards/my-tasks-dashboard.tsx
- src/components/dashboards/design-dashboard.tsx
- src/components/dashboards/add-task-modal.tsx
- src/components/task-templates/task-template-form.tsx
- src/components/task-templates/template-quick-add.tsx
- src/components/opportunities/detail/tabs/OpportunityTasksTab.tsx
- src/components/opportunities/task-indicator.tsx

Hooks:
- src/hooks/useTaskData.ts
- src/hooks/useTaskActions.ts
- src/hooks/useTaskDashboard.ts
- src/hooks/useTaskTemplates.ts

Integration Point:
- src/components/events/detail/tabs/EventPlanningTab.tsx (uses BOTH systems)
```

---

## 7. Conclusion

The dual task system architecture in BoothHQ is intentional and appropriate:

- **Core Tasks** = Event readiness milestones (simple checklist)
- **Tasks** = Work item management (full-featured system)

These systems complement each other and should remain separate. The Event Planning Tab correctly displays both because events need both milestone tracking AND work item management.

No consolidation is recommended. The current architecture serves distinct user needs effectively.
