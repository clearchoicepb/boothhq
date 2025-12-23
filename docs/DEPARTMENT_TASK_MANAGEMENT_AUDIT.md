# Department-Based Task Management Audit Report

**Date:** 2025-12-23
**Purpose:** Audit existing department and task type systems before implementing department-based task management features.

---

## Part 1: User Departments Schema and Management

### Database Schema

**Users Table Columns for Departments:**

| Column | Type | Description |
|--------|------|-------------|
| `department` | TEXT | Legacy single department (DEPRECATED) |
| `department_role` | TEXT | Role within department: `member`, `supervisor`, `manager` (default: 'member') |
| `departments` | TEXT[] | New multi-department support - array of department IDs |
| `manager_of_departments` | TEXT[] | Departments where user is a manager |

**Source Files:**
- Migration: `supabase/migrations/20251101000000_add_department_to_users_and_tasks.sql`
- Multi-dept migration: `supabase/migrations/20251206134718_add_departments_array_to_users.sql`
- Manager-of migration: `supabase/migrations/20251119020000_add_manager_of_departments.sql`

### Valid Department IDs

**Source:** `src/lib/departments.ts:17-24`

```typescript
type DepartmentId =
  | 'sales'
  | 'design'
  | 'operations'
  | 'customer_success'
  | 'accounting'
  | 'admin'
  | 'event_staff'  // Special: excluded from task dashboards
```

### Manager Status

Manager status is tracked via **two separate mechanisms**:

1. **`department_role`** column - values: `member`, `supervisor`, `manager`
   - `manager` = can access ALL departments
   - `supervisor` = can access only their own department
   - `member` = can access only their own department

2. **`manager_of_departments`** array - lists specific departments where user is a manager
   - More granular: user can be manager of Design but member of Sales

### UI for Department Assignment

**File:** `src/app/[tenant]/settings/users/page.tsx`
- Uses `EntityForm` with `userFormConfig`
- **Config:** `src/components/forms/configs/userFormConfig.ts:65-72`
- Uses a special `departmentWithManager` field type that renders checkboxes for:
  - Which departments user belongs to (`departments[]`)
  - Which of those departments they manage (`manager_of_departments[]`)

### Hooks/Services for User Departments

- **`useUsers` hook:** `src/hooks/useUsers.ts` - fetches all users including department info
- **`/api/users` route:** `src/app/api/users/route.ts` - returns user data including departments array

---

## Part 2: Task Types Schema and Usage

### Task Table Columns

| Column | Type | Description |
|--------|------|-------------|
| `department` | TEXT | Which department owns this task (sales, design, operations, etc.) |
| `task_type` | TEXT | Unified task type: `general`, `design`, `operations`, `sales`, `admin`, `project`, `misc` |

**Note:** `department` and `task_type` are **related but different**:
- `department` = organizational ownership (who's responsible)
- `task_type` = functional categorization (what kind of task)

In practice, they often have the same value (e.g., a design task has `department='design'` and `task_type='design'`).

### Unified Task Types

**Source:** `src/types/tasks.ts`

```typescript
type UnifiedTaskType = 'general' | 'design' | 'operations' | 'sales' | 'admin' | 'project' | 'misc'
```

### Department-Specific Task Types

**Source:** `src/lib/departments.ts:127-332`

Each department has predefined task type templates:
- **Sales:** `follow_up_lead`, `send_quote`, `schedule_call`, `contract_review`, `proposal_preparation`
- **Design:** `create_template`, `design_proof`, `final_approval`, `physical_item_order`, `artwork_revision`
- **Operations:** `equipment_check`, `booth_setup`, `staff_assignment`, `logistics_planning`, `equipment_maintenance`
- **Customer Success:** `send_thank_you`, `request_feedback`, `handle_complaint`, `check_in_call`, `onboarding_call`
- **Accounting:** `send_invoice`, `payment_follow_up`, `reconcile_account`, `process_refund`, `deposit_verification`
- **Admin:** `user_onboarding`, `system_maintenance`, `data_backup`, `permission_update`

### Task Type Selection UI

**File:** `src/components/create-task-modal.tsx:214-233`
- Shows a dropdown with all `UNIFIED_TASK_TYPES`
- When a type is selected, related templates are loaded
- **NO filtering of users by task type/department currently implemented**

---

## Part 3: Current Linkage Analysis

### Existing Linkage

1. **Auto-assignment of department on task creation** (`src/app/api/tasks/route.ts:244-263`):
   ```typescript
   // Priority: explicit department > infer from entity > user's department
   let taskDepartment = department
   if (!taskDepartment && entityType) {
     taskDepartment = inferDepartmentFromEntity(entityType)
   }
   if (!taskDepartment) {
     // Uses user's departments array or legacy department
   }
   ```

2. **Department inference from entity type** (`src/lib/departments.ts:388-405`):
   ```typescript
   const entityToDepartmentMap = {
     'opportunity': 'sales',
     'lead': 'sales',
     'event': 'operations',
     'design_item': 'design',
     'invoice': 'accounting',
     // ...
   }
   ```

3. **Filtering users in unified dashboard by department** (`src/components/dashboards/unified-task-dashboard.tsx:170-187`):
   - When a department is selected, user dropdown is filtered to show only users in that department
   - Checks both `departments[]` array and legacy `department` field

### What's MISSING

1. **No filtering of assignees by task department in modals**:
   - `create-task-modal.tsx:321-331` - Shows ALL users, no department filtering
   - `task-detail-modal.tsx:234-245` - Shows ALL users, no department filtering

2. **No explicit task_type ↔ department mapping enforcement**:
   - User can create a "Sales" task and assign it to a Design department user
   - No validation that task_type matches assignee's department

3. **No manager department tabs in My Tasks**:
   - My Tasks (`/dashboard/my-tasks`) only shows tasks assigned to current user
   - No view for managers to see all tasks in their managed departments

---

## Part 4: My Tasks Current Implementation

### Page Structure

**File:** `src/app/[tenant]/dashboard/my-tasks/page.tsx`

**Current Features:**
- Two tabs: Active Tasks / Completed Tasks
- Search bar
- Department filter dropdown (client-side)
- Priority filter dropdown
- Shows tasks where `assigned_to = current user`
- Shows subtasks with parent task indication

**Current Limitations:**
- Only shows user's own tasks (no department view)
- No concept of "departments I manage"
- Department filter is cosmetic - just filters the already-fetched results

### API Endpoint

**File:** `src/app/api/tasks/my-tasks/route.ts`

**Current Query:**
```typescript
let query = supabase
  .from('tasks')
  .select('*')
  .eq('tenant_id', dataSourceTenantId)
  .eq('assigned_to', session.user.id)  // ← ONLY user's own tasks
```

**What would need to change:**
- Add a `viewMode` param (e.g., `myTasks` vs `department:{deptId}`)
- Check if user has manager access to requested department
- Fetch ALL tasks for that department when in department view

---

## Part 5: Gap Analysis

### Critical Gaps for Requirements

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Manager tabs in My Tasks | ❌ Not implemented | Need to add department tabs based on `manager_of_departments` |
| Show ALL tasks for department | ❌ Only shows user's own | Need new API param to fetch by department |
| Filter assignees by department | ❌ Shows all users | Need to pass department to user dropdown |
| Task type → department mapping | ⚠️ Partial (inference only) | Need explicit mapping or auto-set department from task_type |
| Subtasks under parent (collapsed) | ⚠️ Shown flat | Need hierarchy grouping in UI |

### Data Available But Not Used

- ✅ `user.departments[]` - Multi-department membership exists
- ✅ `user.manager_of_departments[]` - Manager departments tracked
- ✅ `task.department` - Task department assignment exists
- ✅ `task.task_type` - Unified task type exists
- ✅ `canAccessDepartment()` - Permission function exists in `src/lib/departments.ts:459-479`

---

## Part 6: Recommended Implementation Approach

### Phase 1: Task Type ↔ Department Mapping

**Problem:** When creating a Design task, the department should auto-set to `design`, but currently requires manual selection.

**Recommended Solution:** Make `department` auto-derived from `task_type`
- In `create-task-modal.tsx`, when user selects task_type, auto-set department
- Remove separate department selection for simplicity
- Formula: `department = task_type` (for core types)

### Phase 2: Department-Filtered Assignee Dropdown

**Files to modify:**
- `src/components/create-task-modal.tsx`
- `src/components/task-detail-modal.tsx`
- `src/components/dashboards/add-task-modal.tsx`

**Implementation:**
```tsx
// Filter users by selected task type/department
const filteredUsers = useMemo(() => {
  if (!taskType) return users; // No filter if no type selected

  return users.filter(user => {
    const userDepts = user.departments || (user.department ? [user.department] : []);
    return userDepts.includes(taskType as DepartmentId);
  });
}, [users, taskType]);
```

### Phase 3: Manager Department Tabs in My Tasks

**Files to modify:**
- `src/app/[tenant]/dashboard/my-tasks/page.tsx`
- `src/app/api/tasks/my-tasks/route.ts`

**UI Changes:**
1. Add tabs: "My Tasks" | "[Design]" | "[Operations]" (based on `manager_of_departments`)
2. When department tab selected, fetch ALL tasks for that department
3. Group tasks by assignee with collapsible subtasks

**API Changes:**
```typescript
// New query param: viewDepartment
if (viewDepartment) {
  // Verify user is manager of this department
  const userManagedDepts = session.user.manager_of_departments || [];
  if (!userManagedDepts.includes(viewDepartment)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch ALL tasks for department (not just user's own)
  query = supabase
    .from('tasks')
    .select('*, assigned_to_user:users(...)')
    .eq('tenant_id', dataSourceTenantId)
    .eq('department', viewDepartment);
}
```

---

## Part 7: Files to Modify

### Core Changes

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `src/app/[tenant]/dashboard/my-tasks/page.tsx` | My Tasks page | Add department tabs, fetch session user's `manager_of_departments` |
| `src/app/api/tasks/my-tasks/route.ts` | My Tasks API | Add `viewDepartment` param, department-wide fetch |
| `src/components/create-task-modal.tsx` | Task creation | Filter users by task_type/department |
| `src/components/task-detail-modal.tsx` | Task editing | Filter users by task department |
| `src/lib/auth.ts` | Auth config | Ensure `manager_of_departments` is in session token |

### Supporting Changes

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `src/hooks/useTaskData.ts` | Task hooks | Add `useDepartmentTasks` hook |
| `src/components/dashboards/add-task-modal.tsx` | Quick add task | Filter users by department |
| `src/types/tasks.ts` | Type definitions | Add view mode types |

---

## Part 8: Suggested Implementation Phases

### Phase 1: Foundation (Backend)
1. Verify `manager_of_departments` is in session token
2. Update `/api/tasks/my-tasks` to accept `viewDepartment` param
3. Add authorization check for department access
4. Create `useDepartmentTasks` hook

### Phase 2: My Tasks UI
1. Fetch current user's `manager_of_departments`
2. Render dynamic tabs for each managed department
3. Show department tasks grouped by assignee
4. Add subtask collapsible sections

### Phase 3: Assignee Filtering
1. Update `create-task-modal.tsx` with department-aware user filtering
2. Update `task-detail-modal.tsx` with same filtering
3. Auto-set department based on task_type selection

### Phase 4: Polish
1. Add visual indicator for subtask progress
2. Add bulk actions for managers
3. Optimize performance with React Query prefetching

---

## Summary

The codebase has **most of the infrastructure** needed for department-based task management:
- ✅ Multi-department user assignment
- ✅ Manager-of-departments tracking
- ✅ Task department column
- ✅ Permission checking functions

**Key gaps to fill:**
1. My Tasks page needs department tabs for managers
2. Task creation/editing needs department-filtered user dropdowns
3. API needs to support department-wide task fetching with authorization

The implementation is primarily UI/UX work with moderate API changes. **No database migrations needed.**
