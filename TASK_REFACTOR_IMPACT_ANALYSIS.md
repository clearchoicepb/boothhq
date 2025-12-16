# Task Refactor Impact Analysis

**Date**: 2025-12-16
**Purpose**: Map all codebase locations touching tasks, design items, or operations items
**Status**: AUDIT COMPLETE - NO CODE CHANGES MADE

---

## 1. Summary Counts

| Category | Files Affected | Estimated Changes |
|----------|----------------|-------------------|
| API Routes | 28 | High complexity - core CRUD + sync logic |
| Components | 15 | Medium complexity - UI updates |
| Services | 5 | High complexity - business logic |
| Hooks | 6 | Medium complexity - data fetching |
| Types | 3 | High complexity - schema definitions |
| Database | 25+ migrations | High complexity - schema changes |
| Workflows | 4 | High complexity - automation logic |

---

## 2. Full File List by Category

### Category A: API Routes

#### Tasks API Routes

| Route | Methods | Tables Touched | Purpose |
|-------|---------|----------------|---------|
| `/api/tasks/route.ts` | GET, POST | tasks | List all tasks, create task |
| `/api/tasks/[id]/route.ts` | GET, PATCH, DELETE | tasks | CRUD single task |
| `/api/tasks/my-tasks/route.ts` | GET | tasks | User's assigned tasks |
| `/api/tasks/dashboard/route.ts` | GET | tasks | Department dashboard stats |
| `/api/tasks/from-template/route.ts` | POST | tasks, task_templates | Create from template |
| `/api/task-templates/route.ts` | GET, POST | task_templates | Manage templates |
| `/api/task-templates/[id]/route.ts` | GET, PATCH, DELETE | task_templates | Single template CRUD |
| `/api/events/tasks-status/route.ts` | GET | tasks | Event task status overview |
| `/api/opportunities/tasks-status/route.ts` | GET | tasks | Opportunity task status |

#### Design Items API Routes

| Route | Methods | Tables Touched | Purpose |
|-------|---------|----------------|---------|
| `/api/events/[id]/design-items/route.ts` | GET, POST | event_design_items, tasks | List/create design items |
| `/api/events/[id]/design-items/[itemId]/route.ts` | PUT, DELETE | event_design_items, tasks, design_statuses | Update/delete design item + sync task |
| `/api/design/dashboard/route.ts` | GET | event_design_items, design_statuses | Design dashboard |
| `/api/design/types/route.ts` | GET, POST | design_item_types | Design type templates |
| `/api/design/types/[id]/route.ts` | GET, PATCH, DELETE | design_item_types | Single type CRUD |
| `/api/design/statuses/route.ts` | GET, POST | design_statuses | Status definitions |
| `/api/design/statuses/[id]/route.ts` | GET, PATCH, DELETE | design_statuses | Single status CRUD |

#### Operations Items API Routes

| Route | Methods | Tables Touched | Purpose |
|-------|---------|----------------|---------|
| `/api/operations/types/route.ts` | GET, POST, PATCH, DELETE | operations_item_types | Operations type templates |
| `/api/operations/types/[id]/route.ts` | GET, PATCH, DELETE | operations_item_types | Single type CRUD |

#### Core Tasks API Routes

| Route | Methods | Tables Touched | Purpose |
|-------|---------|----------------|---------|
| `/api/events/[id]/core-tasks/route.ts` | GET, PATCH | event_core_task_completion | Event checklist |
| `/api/events/[id]/core-tasks/initialize/route.ts` | POST | event_core_task_completion, core_task_templates | Initialize checklist |
| `/api/core-task-templates/route.ts` | GET, POST, PUT, DELETE | core_task_templates | Manage checklist templates |
| `/api/core-tasks/templates/route.ts` | GET | core_task_templates | List templates |

#### Workflow API Routes (create tasks/design/ops items)

| Route | Methods | Tables Touched | Purpose |
|-------|---------|----------------|---------|
| `/api/workflows/route.ts` | GET, POST | workflows, workflow_actions, task_templates, design_item_types | Workflow management |
| `/api/workflows/[id]/route.ts` | GET, PATCH, DELETE | workflows, workflow_actions | Single workflow CRUD |
| `/api/workflows/[id]/actions/route.ts` | GET, POST, PATCH, DELETE | workflow_actions | Workflow actions |
| `/api/cron/workflow-triggers/route.ts` | POST | workflows, tasks, event_design_items, event_operations_items | Cron-triggered workflows |

---

### Category B: Service/Helper Files

| File | Functions | Tables Touched | Purpose |
|------|-----------|----------------|---------|
| `src/lib/api/services/tasksService.ts` | list, getById, create, update, delete, getDashboardData, etc. | tasks | Frontend task API client |
| `src/lib/services/workflowEngine.ts` | executeWorkflowsForEvent, executeCreateTaskAction, executeCreateDesignItemAction, executeCreateOpsItemAction | tasks, event_design_items, event_operations_items, task_templates, design_item_types, operations_item_types | Workflow execution |
| `src/lib/services/workflowActionExecutor.ts` | executeAction (create_task, create_design_item, create_ops_item) | tasks, event_design_items, event_operations_items | Action execution |
| `src/lib/services/workflowTriggerService.ts` | onTaskStatusChanged, onTaskCreated | tasks, workflows | Task-based triggers |
| `src/lib/design-helpers.ts` | createDesignItemWithTask, validateDesignType | event_design_items, design_item_types, tasks | Design item helpers |

---

### Category C: React Components

| Component | Path | Data Source | Purpose |
|-----------|------|-------------|---------|
| `UnifiedTaskDashboard` | src/components/dashboards/unified-task-dashboard.tsx | useTaskDashboard hook | All department tasks |
| `MyTasksDashboard` | src/components/dashboards/my-tasks-dashboard.tsx | tasksService | User's personal tasks |
| `DesignDashboard` | src/components/dashboards/design-dashboard.tsx | /api/design/dashboard | Design team view |
| `AddTaskModal` | src/components/dashboards/add-task-modal.tsx | tasksService.create | Create new task |
| `EventDesignItems` | src/components/events/event-design-items.tsx | /api/events/[id]/design-items | Event design items list |
| `AddDesignItemModal` | src/components/events/add-design-item-modal.tsx | /api/events/[id]/design-items POST | Add design item |
| `EditDesignItemModal` | src/components/events/edit-design-item-modal.tsx | /api/events/[id]/design-items/[id] PUT | Edit design item |
| `EventPlanningTab` | src/components/events/detail/tabs/EventPlanningTab.tsx | Composes multiple | Planning tab container |
| `TasksSection` | src/components/tasks-section.tsx | tasksService | Generic tasks list |
| `EventCoreTasksChecklist` | src/components/event-core-tasks-checklist.tsx | /api/events/[id]/core-tasks | Core tasks checklist |
| `CoreTasksBanner` | src/components/events/core-tasks-banner.tsx | Props | Core tasks status banner |
| `EventInlineTasks` | src/components/events/event-inline-tasks.tsx | Props | Inline task display |
| `TaskTemplateForm` | src/components/task-templates/task-template-form.tsx | /api/task-templates | Template editor |
| `TemplateQuickAdd` | src/components/task-templates/template-quick-add.tsx | tasksService.createFromTemplate | Quick add from template |
| `OpportunityTasksTab` | src/components/opportunities/detail/tabs/OpportunityTasksTab.tsx | tasksService | Opportunity tasks |

---

### Category D: Hooks

| Hook | Path | Purpose |
|------|------|---------|
| `useTaskDashboard` | src/hooks/useTaskDashboard.ts | Dashboard data with stats |
| `useTaskActions` | src/hooks/useTaskActions.ts | Task mutations (create, update, delete) |
| `useTaskData` | src/hooks/useTaskData.ts | Task data fetching |
| `useTaskTemplates` | src/hooks/useTaskTemplates.ts | Template management |
| `useMyTasks` | src/hooks/useTaskDashboard.ts | Current user's tasks |
| `useTasksByUrgency` | src/hooks/useTaskDashboard.ts | Tasks grouped by urgency |

---

### Category E: Types/Interfaces

| File | Types Defined | Purpose |
|------|---------------|---------|
| `src/types/tasks.ts` | Task, TaskWithRelations, TaskStatus, TaskPriority, TaskInsert, TaskUpdate, TaskFilters, TaskDashboardStats, TaskTemplate, etc. | Core task types |
| `src/types/workflows.ts` | WorkflowActionType, WorkflowDesignItemType, WorkflowExecutionResult, ActionExecutionResult | Workflow types including task/design actions |
| `src/types/events.ts` | References core_task_completion | Event types with task refs |

---

### Category F: Workflows/Automations

| File | Actions | Creates |
|------|---------|---------|
| `src/lib/services/workflowEngine.ts` | create_task, create_design_item, create_ops_item, assign_event_role | tasks, event_design_items, event_operations_items |
| `src/lib/services/workflowActionExecutor.ts` | Same as above | Same |
| `src/lib/services/workflowTriggerService.ts` | Triggers on task_created, task_status_changed | Initiates workflows |
| `src/lib/automation/maintenanceAutomation.ts` | Auto-complete stale tasks | tasks |

---

### Category G: Database (Supabase)

#### Task-Related Migrations

| Migration | Tables Created/Modified |
|-----------|------------------------|
| `20250205000000_create_tasks.sql` | tasks |
| `20250208000004_add_event_date_to_tasks.sql` | tasks (add event_date_id) |
| `20251101000000_add_department_to_users_and_tasks.sql` | tasks (add department, task_type), users |
| `20251102000000_create_task_templates.sql` | task_templates |
| `20251102000001_seed_default_task_templates.sql` | task_templates (seed data) |
| `20251216000000_add_project_id_to_tasks.sql` | tasks (add project_id) |
| `20250212000001_create_core_tasks_system.sql` | core_task_templates, event_core_task_completion |
| `20250212000002_backfill_core_tasks_for_existing_events.sql` | event_core_task_completion |

#### Design-Related Migrations

| Migration | Tables Created/Modified |
|-----------|------------------------|
| `20251011120000_create_design_system.sql` | design_item_types, event_design_items |
| `20251011120002_add_design_timeline_fields.sql` | design_item_types (timeline fields) |
| `20251011120003_add_design_to_event_design_items.sql` | event_design_items (add task_id FK) |
| `20251013230000_update_design_type_date_logic.sql` | design_item_types |
| `20251014000000_create_design_statuses.sql` | design_statuses |
| `20251014120000_add_is_completed_to_design_statuses.sql` | design_statuses |
| `20251030000000_fix_design_item_types_schema.sql` | design_item_types |
| `20251031000000_fix_event_design_items_columns.sql` | event_design_items |
| `20251118100000_add_design_items_to_workflows.sql` | workflow_actions (add design_item_type_id) |
| `20251119010000_add_workflow_columns_to_design_items.sql` | event_design_items (workflow tracking) |
| `20251205000000_fix_design_rls_policies.sql` | RLS policies |

#### Operations-Related Migrations

| Migration | Tables Created/Modified |
|-----------|------------------------|
| `20251125000000_create_operations_system.sql` | operations_item_types, event_operations_items |
| `20251125000001_add_operations_to_workflows.sql` | workflow_actions (add operations_item_type_id) |
| `20251125000002_fix_operations_constraint.sql` | event_operations_items |
| `20251125000003_grant_operations_permissions.sql` | Permissions |

---

## 3. Dependency Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │   My Tasks      │   │ Design Dashboard│   │ Event Planning  │          │
│  │   Dashboard     │   │                 │   │     Tab         │          │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│           │                     │                     │                    │
│           ▼                     ▼                     ▼                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │ UnifiedTask     │   │ DesignDashboard │   │ EventPlanningTab│          │
│  │ Dashboard       │   │ Component       │   │ Component       │          │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│           │                     │                     │                    │
└───────────┼─────────────────────┼─────────────────────┼────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              HOOKS LAYER                                   │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│  │ useTaskDashboard│   │   (direct fetch)│   │ useTaskData     │         │
│  │ useTaskActions  │   │                 │   │                 │         │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘         │
└───────────┼─────────────────────┼─────────────────────┼───────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                   │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐                                                      │
│  │ tasksService    │ ──────────────────────────────────────────┐         │
│  └────────┬────────┘                                           │         │
└───────────┼────────────────────────────────────────────────────┼─────────┘
            │                                                     │
            ▼                                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              API ROUTES                                    │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│  │ /api/tasks/*    │   │ /api/design/*   │   │/api/events/[id]/│         │
│  │                 │   │                 │   │  design-items/* │         │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘         │
│           │                     │                     │                   │
│           │                     │     ┌───────────────┘                   │
│           │                     │     │   SYNC HAPPENS HERE               │
│           │                     │     │   (design item → task)            │
│           │                     │     │   BUT NOT REVERSE                 │
│           ▼                     ▼     ▼                                   │
└───────────────────────────────────────────────────────────────────────────┘
            │                     │     │
            ▼                     ▼     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                            DATABASE TABLES                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐        ┌──────────────────────┐                     │
│  │     tasks       │◄───────┤  event_design_items  │                     │
│  │                 │ task_id│                      │                     │
│  │ - id            │        │ - id                 │                     │
│  │ - tenant_id     │        │ - tenant_id          │                     │
│  │ - title         │        │ - event_id           │                     │
│  │ - assigned_to   │        │ - item_name          │                     │
│  │ - entity_type   │        │ - status (7 values)  │                     │
│  │ - entity_id     │        │ - assigned_designer_id│                    │
│  │ - status (4 val)│        │ - task_id ───────────┼────────┐           │
│  │ - department    │        │ - workflow_id        │        │           │
│  │ - task_type     │        │ - design-specific... │        │           │
│  └─────────────────┘        └──────────────────────┘        │           │
│           ▲                                                  │           │
│           │                 ┌──────────────────────┐        │           │
│           └─────────────────┤event_operations_items│◄───────┘           │
│                    task_id  │                      │                     │
│                             │ - id                 │                     │
│                             │ - tenant_id          │                     │
│                             │ - event_id           │                     │
│                             │ - item_name          │                     │
│                             │ - status (4 values)  │                     │
│                             │ - assigned_to_id     │                     │
│                             │ - task_id ───────────┼─┐                   │
│                             │ - workflow_id        │ │                   │
│                             │ - ops-specific...    │ │                   │
│                             └──────────────────────┘ │                   │
│                                                      │                   │
│                                                      ▼                   │
│                             (FK to tasks table)                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Shared vs Unique Fields Comparison

### Fields in ALL Task-Related Tables (Candidates for Unified Base)

| Field | tasks | event_design_items | event_operations_items |
|-------|-------|-------------------|------------------------|
| id | ✓ UUID PK | ✓ UUID PK | ✓ UUID PK |
| tenant_id | ✓ | ✓ | ✓ |
| status | ✓ (4 values) | ✓ (7 values) | ✓ (4 values) |
| assigned_to | ✓ (assigned_to) | ✓ (assigned_designer_id) | ✓ (assigned_to_id) |
| due_date | ✓ (TIMESTAMP) | ✓ (DATE) | ✓ (DATE) |
| completed_at | ✓ | ✓ | ✓ |
| created_at | ✓ | ✓ | ✓ |
| updated_at | ✓ | ✓ | ✓ |
| created_by | ✓ | ✓ | - (missing) |
| description/notes | ✓ (description) | ✓ (internal_notes) | ✓ (description) |

### Fields UNIQUE to tasks

| Field | Type | Purpose |
|-------|------|---------|
| title | VARCHAR(255) | Task name |
| priority | VARCHAR(20) | low/medium/high/urgent |
| entity_type | VARCHAR(50) | Linked entity type |
| entity_id | UUID | Linked entity ID |
| event_date_id | UUID FK | Specific event date |
| project_id | UUID FK | Project link |
| department | TEXT | Department assignment |
| task_type | TEXT | Task category |
| auto_created | BOOLEAN | Workflow created |
| workflow_id | UUID | Source workflow |
| workflow_execution_id | UUID | Execution link |

### Fields UNIQUE to event_design_items

| Field | Type | Purpose |
|-------|------|---------|
| event_id | UUID FK | Event link (always set) |
| design_item_type_id | UUID FK | Design type template |
| item_name | VARCHAR(200) | Item name |
| quantity | INTEGER | Quantity |
| design_deadline | DATE | Legacy deadline field |
| design_start_date | DATE | Start date |
| revision_count | INTEGER | Revision tracking |
| design_file_urls | TEXT[] | Working files |
| proof_file_urls | TEXT[] | Client proofs |
| final_file_urls | TEXT[] | Final deliverables |
| product_id | UUID | Product link |
| client_notes | TEXT | Client-facing notes |
| approved_by | UUID FK | Approver |
| approval_notes | TEXT | Approval comments |
| submitted_for_approval_at | TIMESTAMP | Submission time |
| approved_at | TIMESTAMP | Approval time |
| assigned_at | TIMESTAMP | Assignment time |
| started_at | TIMESTAMP | Work start time |

### Fields UNIQUE to event_operations_items

| Field | Type | Purpose |
|-------|------|---------|
| event_id | UUID FK | Event link (always set) |
| operations_item_type_id | UUID FK | Ops type template |
| item_name | VARCHAR(200) | Item name |

---

## 5. Risk Assessment

| Area | Risk Level | Notes |
|------|------------|-------|
| **My Tasks Page** | **HIGH** | Core user workflow. Must continue working during migration. |
| **Design Dashboard** | **HIGH** | Used daily by design team. Status sync is broken currently. |
| **Event Planning Tab** | **MEDIUM** | Aggregates multiple components. Could be updated incrementally. |
| **Workflow Engine** | **HIGH** | Creates all task types. Must support both old and new during transition. |
| **Task Templates** | **MEDIUM** | Independent feature. Can be migrated separately. |
| **Core Tasks Checklist** | **LOW** | Separate system (event_core_task_completion). Not affected. |
| **Operations Items** | **MEDIUM** | Same pattern as design items. Can use same fix approach. |
| **API Routes** | **HIGH** | Must maintain backward compatibility. |
| **TypeScript Types** | **MEDIUM** | Can be extended without breaking existing code. |
| **Database Migrations** | **HIGH** | Must be carefully planned. Data integrity critical. |

---

## 6. Migration Feasibility

### Auto-Migration Capability

| Area | Auto-Migrate? | Notes |
|------|---------------|-------|
| tasks table schema | Yes | Add columns via migrations |
| event_design_items data | Partial | Existing task_id links preserved |
| event_operations_items data | Partial | Existing task_id links preserved |
| Status value mapping | Manual | Design has more statuses than tasks |
| Workflow actions | Yes | Already create linked records |

### UI Stability During Transition

| Component | Keep Working? | Approach |
|-----------|---------------|----------|
| My Tasks Dashboard | Yes | Add reverse sync first, then refactor |
| Design Dashboard | Yes | Queries design items directly (unchanged) |
| Event Detail | Yes | Uses both systems (design items + tasks) |
| Workflows | Yes | Already creates both records |

### Incremental vs All-at-Once

**Recommendation: INCREMENTAL**

The current architecture allows for incremental fixes:
1. Fix reverse sync (tasks → design/ops items) first
2. Add missing fields to task creation
3. Consider unified table later if needed

---

## 7. Recommended Migration Order

### Phase 1: Fix Current Bugs (Immediate - No Schema Changes)

1. **Fix reverse sync in `/api/tasks/[id]/route.ts`**
   - When task status changes, update linked design_item
   - When task status changes, update linked operations_item
   - ~20 lines of code

2. **Fix `design-helpers.ts` task creation**
   - Change `event_id` to `entity_type`/`entity_id`
   - Add `assigned_to` field
   - ~10 lines of code

3. **Fix `/api/events/[id]/design-items/route.ts` task creation**
   - Same fixes as above

### Phase 2: Improve Consistency (Short-term)

1. **Add `created_by` to operations items migration**
2. **Standardize assignment field names** (feature flag)
3. **Add status mapping helper** (design status ↔ task status)

### Phase 3: Consider Unified Architecture (Long-term)

Only if business requirements demand it:
1. Create unified `task_items` view spanning all tables
2. Or migrate to single table with `source_type` discriminator
3. Deprecate separate tables gradually

---

## 8. Files Requiring Changes (By Priority)

### Critical (Fix Sync Issues)

| File | Line(s) | Change Required |
|------|---------|-----------------|
| `src/app/api/tasks/[id]/route.ts` | 42-159 | Add reverse sync to design/ops items |
| `src/lib/design-helpers.ts` | 113-126 | Fix task creation fields |
| `src/app/api/events/[id]/design-items/route.ts` | 156-168 | Fix task creation fields |

### Important (Improve Reliability)

| File | Change Required |
|------|-----------------|
| `src/lib/services/workflowEngine.ts` | Verify task creation is correct (it is) |
| `src/types/tasks.ts` | Consider adding design_item_id/ops_item_id fields |

### Optional (Future Enhancement)

| File | Change Required |
|------|-----------------|
| All design/ops API routes | Add transaction boundaries |
| `src/types/database.ts` | Add proper types for all tables |

---

## Summary

The codebase has **28 API routes**, **15 components**, **6 hooks**, and **25+ migrations** touching the task system. The core issue is **one-way synchronization**: design/operations items update their linked tasks, but task updates don't propagate back.

**Recommended approach**: Fix the reverse sync bug first (Phase 1), which affects only 3 files. This preserves the current architecture while fixing the user-facing issue. A unified table architecture (Phase 3) would require significant refactoring across 50+ files and is not necessary to solve the immediate problem.

---

*This audit report is for informational purposes only. No code changes were made.*
