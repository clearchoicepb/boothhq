# Task System Audit & Subtask Implementation Plan

## 1. Current Task System Architecture

### 1.1 Database Schema (tasks table)

**Core Columns:**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NOT NULL | Primary key |
| `tenant_id` | UUID | NOT NULL | FK to tenants |
| `title` | VARCHAR(255) | NOT NULL | Task title |
| `description` | TEXT | NULL | Task description |
| `assigned_to` | UUID | NULL | FK to users (single assignee) |
| `created_by` | UUID | NOT NULL | FK to users |
| `entity_type` | VARCHAR(50) | NULL | 'opportunity', 'account', 'contact', 'lead', 'invoice', 'event' |
| `entity_id` | UUID | NULL | Polymorphic entity link |
| `event_date_id` | UUID | NULL | FK to event_dates (for multi-date events) |
| `project_id` | UUID | NULL | FK to projects (direct link for project tasks) |
| `status` | VARCHAR(50) | NOT NULL | pending, in_progress, awaiting_approval, needs_revision, approved, completed, cancelled |
| `priority` | VARCHAR(20) | NOT NULL | low, medium, high, urgent |
| `due_date` | TIMESTAMPTZ | NULL | When task is due |
| `completed_at` | TIMESTAMPTZ | NULL | When completed |
| `department` | TEXT | NULL | Department ID (sales, design, operations, etc.) |
| `task_type` | TEXT | NULL | Unified task type (general, design, operations, sales, admin, project, misc) |
| `task_template_id` | UUID | NULL | FK to task_templates |

**Design-Specific Columns (for task_type='design'):**
- `quantity`, `revision_count`, `design_file_urls`, `proof_file_urls`, `final_file_urls`
- `client_notes`, `internal_notes`, `design_deadline`, `design_start_date`
- `product_id` (FK to products)

**Approval Workflow Columns:**
- `requires_approval`, `approved_by`, `approval_notes`
- `submitted_for_approval_at`, `approved_at`

**Timeline Tracking:**
- `assigned_at`, `started_at`

**Audit Fields:**
- `created_at`, `updated_at`

**Migration Tracking:**
- `migrated_from_table`, `migrated_from_id`

**Workflow Tracking:**
- `auto_created`, `workflow_id`, `workflow_execution_id`

### 1.2 Current RLS Policies

From `20250205000000_create_tasks.sql`:
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tasks ON tasks
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Note:** There's a commented-out department-based RLS policy in `20251101000000` that was never activated.

### 1.3 Existing Indexes

- `idx_tasks_tenant_id` - Tenant filtering
- `idx_tasks_assigned_to` - Assignment queries
- `idx_tasks_created_by` - Creator queries
- `idx_tasks_entity` - Entity (entity_type, entity_id)
- `idx_tasks_status`, `idx_tasks_priority`, `idx_tasks_due_date`
- `idx_tasks_department`, `idx_tasks_department_status`, `idx_tasks_department_assigned`
- `idx_tasks_task_type`, `idx_tasks_tenant_task_type`
- `idx_tasks_project_id`, `idx_tasks_tenant_project`, `idx_tasks_project_status`

### 1.4 Staff Assignment Implementation

**Current Model:**
- Single assignee only (`assigned_to` UUID → users.id)
- `assigned_at` timestamp tracks when assignment occurred
- Assignment displayed via joined `assigned_to_user` relation
- Selection UI uses `useUsers()` hook to populate user dropdown

**API Pattern (from `/api/tasks/route.ts`):**
```typescript
// Query with relation
.select(`
  *,
  assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
  ...
`)
```

### 1.5 Key Components

| File | Purpose |
|------|---------|
| `src/app/api/tasks/route.ts` | CRUD endpoints (GET list, POST create) |
| `src/app/api/tasks/[id]/route.ts` | Single task operations (GET, PATCH, DELETE) |
| `src/lib/api/services/tasksService.ts` | Client-side API service layer |
| `src/hooks/useTaskData.ts` | React Query data hooks |
| `src/hooks/useTaskActions.ts` | React Query mutation hooks |
| `src/components/create-task-modal.tsx` | Task creation UI |
| `src/components/task-detail-modal.tsx` | Task viewing/editing UI |
| `src/components/tasks-section.tsx` | Task list component |
| `src/types/tasks.ts` | TypeScript type definitions |

---

## 2. Subtask Implementation Recommendation

### 2.1 Schema Approach: Self-Referential (RECOMMENDED)

**Option A: Self-Referential (parent_task_id on same table)** ✅ RECOMMENDED

**Pros:**
- Simpler schema - single table to manage
- Natural inheritance of shared fields (tenant_id, entity_type, etc.)
- Existing CRUD operations work with minimal changes
- Subtasks are "full tasks" - can have their own subtasks if needed
- Consistent data model across the app
- RLS policy already applies

**Cons:**
- Need to handle circular reference prevention
- Queries need to filter out subtasks in parent lists (or include them hierarchically)
- Slightly more complex status rollup logic

**Option B: Separate subtasks table**

**Pros:**
- Clean separation of concerns
- Subtasks can have a leaner schema if needed

**Cons:**
- Duplicate schema definition and maintenance
- Need separate API routes, hooks, services
- More complex joins for combined views
- Separate RLS policies needed
- Harder to promote subtask to task or demote task to subtask

### 2.2 Recommended Schema Changes

Add to `tasks` table:

```sql
-- Migration: 20251223000000_add_subtask_support.sql

-- Add parent_task_id for subtask hierarchy
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add display order for subtask ordering within parent
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Index for fetching subtasks of a parent
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Composite index for ordered subtask retrieval
CREATE INDEX IF NOT EXISTS idx_tasks_parent_display_order
  ON tasks(parent_task_id, display_order)
  WHERE parent_task_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task ID for subtasks. NULL for top-level tasks.';
COMMENT ON COLUMN tasks.display_order IS 'Display order for subtasks within a parent. Default 0.';
```

### 2.3 Subtask Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| Each subtask can be assigned to a staff member | Uses existing `assigned_to` column - no changes needed |
| Subtasks inherit tenant_id from parent | Enforce in API layer during creation; parent lookup validates |
| Track completion status independently | Uses existing `status` and `completed_at` columns |
| Subtask completion affects parent status | Computed in API/UI; parent status can auto-update when all children complete |

### 2.4 RLS Policy

**No changes needed!** The existing tenant isolation policy applies:
```sql
CREATE POLICY tenant_isolation_tasks ON tasks
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

Subtasks inherit `tenant_id` from parent, so they're automatically covered.

---

## 3. Implementation Plan

### Phase 1: Database Migration (Day 1)

1. Create migration `20251223000000_add_subtask_support.sql`
2. Apply to tenant database
3. Verify with test queries

**Files to create:**
- `supabase/migrations/20251223000000_add_subtask_support.sql`

### Phase 2: Type Updates (Day 1)

Update TypeScript types to include subtask fields.

**Files to modify:**
- `src/types/tasks.ts` - Add `parent_task_id` and `display_order` to `Task` interface

### Phase 3: API Updates (Day 2)

1. **GET /api/tasks** - Add filter for `parentTaskId` to fetch subtasks
2. **GET /api/tasks/[id]** - Include subtasks in response
3. **POST /api/tasks** - Accept `parentTaskId`, enforce tenant inheritance
4. **PATCH /api/tasks/[id]** - Handle status rollup if configured

**Files to modify:**
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/route.ts`

**Optional new route:**
- `src/app/api/tasks/[id]/subtasks/route.ts` (convenience endpoint)

### Phase 4: Service Layer Updates (Day 2)

Update client service to support subtask operations.

**Files to modify:**
- `src/lib/api/services/tasksService.ts`
  - Add `createSubtask(parentId, data)` method
  - Add `getSubtasks(parentId)` method
  - Update `list()` to accept `parentTaskId` filter

### Phase 5: Hook Updates (Day 3)

Add React Query hooks for subtasks.

**Files to modify:**
- `src/types/tasks.ts` - Add `TaskFilters.parentTaskId`
- `src/hooks/useTaskData.ts` - Add `useSubtasks(parentId)` hook
- `src/hooks/useTaskActions.ts` - Add `useCreateSubtask()` hook

### Phase 6: UI Components (Day 3-4)

1. **Task Detail Modal** - Add subtasks section with:
   - List of subtasks with status toggles
   - "Add Subtask" button/inline form
   - Drag-to-reorder (optional)

2. **Subtask Row Component** - Lightweight task row for subtask display

3. **Tasks Section** - Optionally show subtask count indicator

**Files to modify:**
- `src/components/task-detail-modal.tsx`
- `src/components/tasks-section.tsx`

**Files to create:**
- `src/components/subtask-list.tsx` (optional, can inline in task-detail-modal)
- `src/components/subtask-row.tsx` (optional)

### Phase 7: Status Rollup Logic (Day 4)

Implement optional parent status auto-update:

**Options:**
1. **Manual only** - Parent status is independent of subtasks
2. **Auto-complete** - Parent auto-completes when all subtasks complete
3. **Progress indicator** - Show "3/5 subtasks done" without auto-update

**Recommended:** Start with #3 (progress indicator) + optional #2 via API flag

---

## 4. Detailed File Changes Summary

### Must Modify:
| File | Changes |
|------|---------|
| `src/types/tasks.ts` | Add `parent_task_id`, `display_order`, `subtasks?: Task[]` |
| `src/app/api/tasks/route.ts` | Add `parentTaskId` filter, enforce tenant on create |
| `src/app/api/tasks/[id]/route.ts` | Include subtasks in GET response |
| `src/lib/api/services/tasksService.ts` | Add subtask methods |
| `src/hooks/useTaskData.ts` | Add `useSubtasks()` hook |
| `src/hooks/useTaskActions.ts` | Add `useCreateSubtask()` hook |
| `src/components/task-detail-modal.tsx` | Add subtasks UI section |

### Must Create:
| File | Purpose |
|------|---------|
| `supabase/migrations/20251223000000_add_subtask_support.sql` | Schema migration |

### Optional/Enhancement:
| File | Purpose |
|------|---------|
| `src/app/api/tasks/[id]/subtasks/route.ts` | Dedicated subtasks endpoint |
| `src/components/subtask-list.tsx` | Reusable subtask list component |

---

## 5. Design Decisions (APPROVED 2025-12-23)

1. **Should subtask completion auto-update parent status?**
   - [x] **Show progress only (e.g., "3/5 done")** - Parent status is independent

2. **Can subtasks have their own subtasks (nested hierarchy)?**
   - [x] **No, only one level deep** - Enforced via database constraint

3. **Should subtasks inherit assignee from parent by default?**
   - [x] **No, always unassigned by default**

4. **Subtask display in task lists:**
   - [x] **Show subtask count badge only**

5. **Should subtasks inherit due date from parent?**
   - [x] **Yes, default to parent's due date** - Applied in API layer during creation

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Circular parent references | Add database CHECK constraint or trigger |
| Performance with deep hierarchies | Limit nesting depth; use recursive CTEs carefully |
| UI complexity | Start with simple inline list; iterate based on feedback |
| Breaking existing task queries | Ensure `parent_task_id IS NULL` filter in existing list views |

---

## Approval Status

**APPROVED: 2025-12-23**

- [x] Open questions answered (Section 5)
- [x] Self-referential approach confirmed
- [x] Proceeding with implementation

### Implementation Progress

- [x] Phase 1: Database Migration
- [x] Phase 2: Type Updates
- [x] Phase 3: API Updates
- [x] Phase 4: Service Layer Updates
- [x] Phase 5: Hook Updates
- [ ] Phase 6: UI Components
- [ ] Phase 7: Status Rollup Logic (Progress indicator only)
