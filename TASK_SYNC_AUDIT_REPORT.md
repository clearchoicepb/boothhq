# Task Synchronization Audit Report

**Date**: 2025-12-16
**Auditor**: Claude Code Audit
**Status**: AUDIT COMPLETE - NO CODE CHANGES MADE

---

## Executive Summary

The task synchronization system has **critical architectural issues** that prevent Design Item Tasks and Operations Item Tasks from properly syncing with the "My Tasks" area. The root causes are:

1. **One-way synchronization** - Design items sync TO tasks, but NOT vice versa
2. **Invalid column reference** in `design-helpers.ts` - uses non-existent `event_id` column
3. **Missing `assigned_to` on design item creation** - tasks created from design-helpers lack the `assigned_to` field

---

## Database Schema Analysis

### Three Separate Task-Related Tables

```
┌─────────────────────┐     ┌──────────────────────────┐
│       tasks         │◄────┤   event_design_items     │
├─────────────────────┤     ├──────────────────────────┤
│ id (PK)             │     │ id (PK)                  │
│ tenant_id           │     │ tenant_id                │
│ title               │     │ event_id (FK)            │
│ description         │     │ design_item_type_id (FK) │
│ assigned_to (FK)    │     │ item_name                │
│ created_by (FK)     │     │ status                   │
│ entity_type         │     │ assigned_designer_id(FK) │
│ entity_id           │     │ task_id (FK) ────────────┼───────┐
│ event_date_id (FK)  │     │ ...                      │       │
│ project_id (FK)     │     └──────────────────────────┘       │
│ status              │                                         │
│ priority            │     ┌──────────────────────────┐       │
│ due_date            │◄────┤ event_operations_items   │       │
│ department          │     ├──────────────────────────┤       │
│ task_type           │     │ id (PK)                  │       │
│ ...                 │     │ tenant_id                │       │
└─────────────────────┘     │ event_id (FK)            │       │
        ▲                   │ operations_item_type_id  │       │
        │                   │ item_name                │       │
        │                   │ status                   │       │
        │                   │ assigned_to_id (FK)      │       │
        └───────────────────┤ task_id (FK) ────────────┼───────┘
                            │ ...                      │
                            └──────────────────────────┘
```

### Key Schema Observations

| Table | Assignment Field | Task Linkage | Status Values |
|-------|-----------------|--------------|---------------|
| `tasks` | `assigned_to` | N/A (is the source) | pending, in_progress, completed, cancelled |
| `event_design_items` | `assigned_designer_id` | `task_id` FK to tasks | pending, in_progress, awaiting_approval, approved, needs_revision, completed, cancelled |
| `event_operations_items` | `assigned_to_id` | `task_id` FK to tasks | pending, in_progress, completed, cancelled |

**ISSUE**: Design items have more status values than tasks, creating mapping complexity.

---

## Root Cause Analysis

### Issue 1: One-Way Synchronization

**Location**: `src/app/api/tasks/[id]/route.ts` (PATCH handler, lines 42-159)

**Problem**: When a task is updated via the Tasks API (e.g., from "My Tasks"), the linked `event_design_items` or `event_operations_items` record is **NOT updated**.

**Current Flow**:
```
Design Item Update → Task Updated ✓
Task Update       → Design Item NOT Updated ✗
```

**Expected Flow**:
```
Design Item Update ←→ Task Updated (bidirectional)
```

### Issue 2: Invalid Column in design-helpers.ts

**Location**: `src/lib/design-helpers.ts` (lines 113-126)

**Problem**: Task creation uses `event_id` which does not exist in the `tasks` table schema:

```typescript
// BUG: Line 115-118 in design-helpers.ts
const { data: task, error: taskError } = await supabase
  .from('tasks')
  .insert({
    tenant_id: tenantId,
    event_id: eventId,      // ← INVALID! Column doesn't exist
    title: taskName,
    // ...
  })
```

**Correct Fields**: Should use `entity_type: 'event'` and `entity_id: eventId`

### Issue 3: Missing assigned_to in design-helpers.ts

**Location**: `src/lib/design-helpers.ts` (lines 113-126)

**Problem**: Task creation doesn't include `assigned_to` or `created_by`:

```typescript
// Missing fields in task insert:
// - assigned_to: should be the designer
// - created_by: should be system or current user
```

### Issue 4: Workflow Engine is Correct (Reference)

**Location**: `src/lib/services/workflowEngine.ts` (lines 306-323)

The workflow engine correctly creates tasks:

```typescript
// CORRECT implementation in workflowEngine.ts
const { data: task } = await supabase
  .from('tasks')
  .insert({
    tenant_id: dataSourceTenantId,
    entity_type: 'event',        // ✓ Correct
    entity_id: context.triggerEntity.id,  // ✓ Correct
    title: taskName,
    assigned_to: action.assigned_to_user_id,  // ✓ Correct
    department: 'design',
    auto_created: true,
    workflow_id: action.workflow_id
  })
```

---

## Query Analysis

### My Tasks Dashboard Query

**Location**: `src/app/api/tasks/my-tasks/route.ts`

**What it queries**: Only the `tasks` table filtered by `assigned_to = session.user.id`

**What it DOESN'T query**: `event_design_items` or `event_operations_items`

**Implication**: Design items assigned to a user will only appear in My Tasks IF a linked task exists with the correct `assigned_to` value.

### Design Dashboard Query

**Location**: `src/app/api/design/dashboard/route.ts`

**What it queries**: `event_design_items` table with joins to events, designers, and design_item_types

**Does NOT** use the tasks table at all for its primary data.

---

## Sync Logic Audit

### ✅ Working: Design Item → Task Sync

**Location**: `src/app/api/events/[id]/design-items/[itemId]/route.ts` (lines 47-53)

```typescript
// When design item status is updated, task is also updated
if (designItem.task_id && body.status) {
  const taskStatus = isCompletedStatus ? 'completed' : 'in_progress'
  await supabase
    .from('tasks')
    .update({ status: taskStatus })
    .eq('id', designItem.task_id)
}
```

### ❌ Missing: Task → Design Item Sync

**Location**: `src/app/api/tasks/[id]/route.ts`

The PATCH handler updates task fields but does **NOT**:
1. Look up linked `event_design_items` by task_id
2. Update the design item's status
3. Update the design item's completed_at timestamp

### ❌ Missing: Task → Operations Item Sync

Same issue - no reverse sync from tasks to `event_operations_items`.

---

## Column Mismatch Issues

### 1. `event_id` vs `entity_type`/`entity_id`

| File | Uses | Should Use |
|------|------|------------|
| `design-helpers.ts` | `event_id` (invalid) | `entity_type: 'event', entity_id: eventId` |
| `workflowEngine.ts` | `entity_type`, `entity_id` | ✓ Correct |
| `/api/events/[id]/design-items/route.ts` | `event_id` (invalid) | `entity_type: 'event', entity_id: id` |

### 2. Status Value Mismatch

Design items have statuses (`awaiting_approval`, `approved`, `needs_revision`) that don't map to task statuses.

**Current Mapping** (design-items/[itemId]/route.ts):
- `is_completed_status = true` → task status = `completed`
- Otherwise → task status = `in_progress`

This loses granularity when syncing.

---

## TypeScript Type Analysis

### Task Type (`src/types/tasks.ts`)

```typescript
export interface Task {
  id: string
  tenant_id: string
  // ...
  entity_type: string | null  // Correct
  entity_id: string | null    // Correct
  // NO event_id field - correct
}
```

### Database Types (`src/types/database.ts`)

**Issue**: The database types file does NOT include `tasks`, `event_design_items`, or `event_operations_items` tables. This indicates types may be out of sync with actual schema.

---

## Specific Code Locations with Issues

| File | Line(s) | Issue |
|------|---------|-------|
| `src/lib/design-helpers.ts` | 115-118 | Uses `event_id` instead of `entity_type`/`entity_id` |
| `src/lib/design-helpers.ts` | 113-126 | Missing `assigned_to` and `created_by` fields |
| `src/app/api/events/[id]/design-items/route.ts` | 156-168 | Uses `event_id` instead of `entity_type`/`entity_id` |
| `src/app/api/tasks/[id]/route.ts` | 42-159 | Missing reverse sync to design/ops items |
| `src/types/database.ts` | entire file | Missing tasks and design_items table types |

---

## Scalability Concerns

### 1. Tightly Coupled Table Design
Adding new task types (e.g., "Marketing Items") requires creating new tables that mirror the design/operations pattern.

### 2. Multiple Sources of Truth
Task status exists in both `tasks` table and `event_design_items`/`event_operations_items`, requiring bi-directional sync.

### 3. Inconsistent Assignment Fields
- `tasks.assigned_to`
- `event_design_items.assigned_designer_id`
- `event_operations_items.assigned_to_id`

### 4. No Transaction Boundaries
Status updates happen without transactions, risking inconsistent state.

---

## Recommended Solution Architecture

### Option A: Unified Tasks Table (Preferred)

Convert `event_design_items` and `event_operations_items` to be views/metadata on top of the tasks table:

```
tasks (unified)
├── id, tenant_id, title, status, assigned_to, etc.
├── task_source: 'manual' | 'design' | 'operations' | 'workflow'
├── source_item_id: UUID (references source table)
└── source_table: 'event_design_items' | 'event_operations_items' | null

event_design_items (metadata only)
├── id, event_id, design_item_type_id
├── task_id (FK to tasks - required, not optional)
└── design-specific fields (proofs, revisions, etc.)
```

### Option B: Centralized Task Service

Create a service layer that handles all task operations:

```typescript
// taskSyncService.ts
class TaskSyncService {
  async updateTaskStatus(taskId: string, status: string) {
    // 1. Update task
    // 2. Find linked design_items where task_id = taskId
    // 3. Update linked items
    // 4. Find linked operations_items where task_id = taskId
    // 5. Update linked items
  }
}
```

### Option C: Database Triggers

Add PostgreSQL triggers to automatically sync:

```sql
CREATE TRIGGER sync_task_to_design_item
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_status_to_linked_items();
```

---

## Immediate Fixes Required

### Fix 1: Correct design-helpers.ts Task Creation

```typescript
// Change from:
event_id: eventId,

// To:
entity_type: 'event',
entity_id: eventId,
assigned_to: assignedDesignerId || null,
created_by: userId || assignedDesignerId, // Need to pass userId
```

### Fix 2: Add Reverse Sync to Tasks API

In `src/app/api/tasks/[id]/route.ts` PATCH handler, add:

```typescript
// After updating task, sync to linked items
if (status !== undefined) {
  // Sync to design items
  await supabase
    .from('event_design_items')
    .update({
      status: mapTaskStatusToDesignStatus(status),
      completed_at: status === 'completed' ? new Date().toISOString() : null
    })
    .eq('task_id', id)

  // Sync to operations items
  await supabase
    .from('event_operations_items')
    .update({
      status: status,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    })
    .eq('task_id', id)
}
```

### Fix 3: Ensure Task Creation Includes Assignment

All task creation for design/ops items must include `assigned_to` field.

---

## Summary

| Finding | Severity | Impact |
|---------|----------|--------|
| One-way sync (no task→item sync) | **CRITICAL** | Tasks updated in My Tasks don't reflect in Design Dashboard |
| Invalid `event_id` column usage | **CRITICAL** | Task creation fails silently |
| Missing `assigned_to` on task creation | **HIGH** | Tasks don't appear in user's My Tasks |
| Status value mismatch | **MEDIUM** | Loss of granularity in sync |
| Missing TypeScript types | **LOW** | Type safety gaps |

**Recommendation**: Implement Fix 2 (reverse sync) as the immediate priority, then Fix 1 to ensure new task creation works correctly. Long-term, consider Option A (unified tasks table) for scalability.

---

*This audit report is for informational purposes only. No code changes were made.*
