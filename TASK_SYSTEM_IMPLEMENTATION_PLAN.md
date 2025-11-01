# Task Management System - Complete Implementation Plan

**Date**: 2025-11-01
**Status**: Pre-Launch - Build It Right The FIRST Time
**Business Context**: Photo booth rental CRM + Event Management Platform

---

## 🎯 Vision

**"One unified task system integrated into every module, with department-based dashboards and supervision capabilities."**

Your team logs in → sees their personalized dashboard → attacks their day focused on tasks at hand.

---

## 📊 What You Already Have (Foundation)

### ✅ Existing Infrastructure

**1. Task API** (`/api/tasks/route.ts`)
- ✅ GET with filters (entityType, entityId, assignedTo, status)
- ✅ POST to create tasks
- ✅ Entity linking (opportunities, events, accounts, contacts, etc.)
- ✅ Assignment to users
- ✅ Priority levels (low, medium, high, urgent)
- ✅ Status tracking (pending, in_progress, completed, cancelled)
- ✅ Event date linking (event_date_id)

**2. Tasks Component** (`/components/tasks-section.tsx`)
- ✅ Display tasks for an entity
- ✅ Status updates
- ✅ Task detail modal
- ✅ Filtering by date/event

**3. Design Dashboard** (`/dashboard/design/page.tsx`)
- ✅ Department-specific dashboard (designers)
- ✅ KPI cards with metrics
- ✅ Deadline tracking
- ✅ Urgency categorization
- ✅ Task status updates
- ✅ Filtering by designer and status

**4. Database Schema**
```sql
tasks table:
- id, tenant_id
- title, description
- assigned_to (user_id)
- created_by (user_id)
- entity_type, entity_id (polymorphic)
- event_date_id (specific event date)
- status, priority, due_date
- completed_at, created_at, updated_at
```

---

## 🚀 What Needs To Be Built

### Phase 1: Department Foundation (Week 1)

#### 1.1 Department Configuration System

**Create**: `src/lib/departments.ts`

```typescript
// Department definitions for photo booth business
export const DEPARTMENTS = {
  SALES: {
    id: 'sales',
    name: 'Sales',
    icon: 'TrendingUp',
    color: '#10b981', // green
    description: 'Lead generation, opportunities, quotes'
  },
  DESIGN: {
    id: 'design',
    name: 'Design & Creative',
    icon: 'Palette',
    color: '#8b5cf6', // purple
    description: 'Design items, proofs, templates'
  },
  OPERATIONS: {
    id: 'operations',
    name: 'Operations',
    icon: 'Briefcase',
    color: '#f59e0b', // amber
    description: 'Event execution, logistics, booth setup'
  },
  CUSTOMER_SUCCESS: {
    id: 'customer_success',
    name: 'Customer Success',
    icon: 'Users',
    color: '#3b82f6', // blue
    description: 'Client communication, satisfaction'
  },
  ACCOUNTING: {
    id: 'accounting',
    name: 'Accounting',
    icon: 'DollarSign',
    color: '#ef4444', // red
    description: 'Invoicing, payments, collections'
  },
  ADMIN: {
    id: 'admin',
    name: 'Administration',
    icon: 'Settings',
    color: '#6b7280', // gray
    description: 'System management, settings'
  }
} as const

export type DepartmentId = keyof typeof DEPARTMENTS

// Task types by department
export const DEPARTMENT_TASK_TYPES = {
  sales: [
    { id: 'follow_up_lead', name: 'Follow Up Lead', defaultPriority: 'high' },
    { id: 'send_quote', name: 'Send Quote', defaultPriority: 'high' },
    { id: 'schedule_call', name: 'Schedule Call', defaultPriority: 'medium' },
    { id: 'contract_review', name: 'Contract Review', defaultPriority: 'high' },
  ],
  design: [
    { id: 'create_template', name: 'Create Template', defaultPriority: 'medium' },
    { id: 'design_proof', name: 'Design Proof', defaultPriority: 'high' },
    { id: 'final_approval', name: 'Final Approval', defaultPriority: 'urgent' },
    { id: 'physical_item_order', name: 'Physical Item Order', defaultPriority: 'high' },
  ],
  operations: [
    { id: 'equipment_check', name: 'Equipment Check', defaultPriority: 'high' },
    { id: 'booth_setup', name: 'Booth Setup', defaultPriority: 'urgent' },
    { id: 'staff_assignment', name: 'Staff Assignment', defaultPriority: 'high' },
    { id: 'logistics_planning', name: 'Logistics Planning', defaultPriority: 'medium' },
  ],
  customer_success: [
    { id: 'send_thank_you', name: 'Send Thank You', defaultPriority: 'low' },
    { id: 'request_feedback', name: 'Request Feedback', defaultPriority: 'medium' },
    { id: 'handle_complaint', name: 'Handle Complaint', defaultPriority: 'urgent' },
    { id: 'check_in_call', name: 'Check-in Call', defaultPriority: 'medium' },
  ],
  accounting: [
    { id: 'send_invoice', name: 'Send Invoice', defaultPriority: 'high' },
    { id: 'payment_follow_up', name: 'Payment Follow-up', defaultPriority: 'high' },
    { id: 'reconcile_account', name: 'Reconcile Account', defaultPriority: 'medium' },
    { id: 'process_refund', name: 'Process Refund', defaultPriority: 'high' },
  ],
  admin: [
    { id: 'user_onboarding', name: 'User Onboarding', defaultPriority: 'medium' },
    { id: 'system_maintenance', name: 'System Maintenance', defaultPriority: 'low' },
    { id: 'data_backup', name: 'Data Backup', defaultPriority: 'medium' },
  ]
} as const
```

#### 1.2 Add Department to User Schema

**Database Migration**: `add_department_to_users.sql`

```sql
-- Add department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

-- Add department_role column (member, supervisor, manager)
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_role TEXT DEFAULT 'member';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_department_role ON users(department, department_role);

-- Add department to tasks for better filtering
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department);
```

#### 1.3 Update Task API to Include Department

**Update**: `src/app/api/tasks/route.ts`

Add department filtering:
```typescript
// In GET endpoint
const department = searchParams.get('department')
if (department) {
  query = query.eq('department', department)
}

// In POST endpoint
const { department } = body
// Auto-assign department based on entity type or user's department
const taskDepartment = department || inferDepartmentFromEntity(entityType) || session.user.department
```

---

### Phase 2: Unified Task Dashboard (Week 2)

#### 2.1 Create Main Task Dashboard Page

**Create**: `src/app/[tenant]/dashboard/tasks/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'
import { AppLayout } from '@/components/layout/app-layout'
import { DEPARTMENTS } from '@/lib/departments'

export default function TasksDashboardPage() {
  const { data: session } = useSession()
  const userDepartment = session?.user?.department

  return (
    <AppLayout>
      <UnifiedTaskDashboard
        userDepartment={userDepartment}
        showAllDepartments={session?.user?.department_role === 'manager'}
      />
    </AppLayout>
  )
}
```

#### 2.2 Create Unified Task Dashboard Component

**Create**: `src/components/dashboards/unified-task-dashboard.tsx`

This will be similar to design-dashboard.tsx but:
- Works for ALL departments
- Shows department-specific task types
- Has department filtering tabs
- Shows supervision view for managers

**Key Features**:
```typescript
// Department tabs at top
<DepartmentTabs
  departments={visibleDepartments}
  activeDepartment={selectedDepartment}
  onChange={setSelectedDepartment}
/>

// KPI cards (customized per department)
<TaskKPICards
  stats={dashboardData.stats}
  department={selectedDepartment}
/>

// Tasks grouped by priority/urgency
<TaskList
  tasks={dashboardData.tasks}
  groupBy={groupBy} // 'priority' | 'urgency' | 'dueDate' | 'assignee'
  onTaskClick={openTaskModal}
/>

// Supervision view for managers
{isSupervisor && (
  <SupervisionPanel
    departmentStats={supervisorStats}
    teamMembers={teamMembers}
    onReassign={handleReassignTask}
  />
)}
```

---

### Phase 3: Department-Specific Dashboards (Week 3)

Create dashboard for each department using the SAME pattern as design:

#### 3.1 Sales Dashboard
**Create**: `/dashboard/sales/page.tsx`

Focus:
- Follow-ups needed
- Quotes to send
- Calls to schedule
- Deals closing this week

#### 3.2 Operations Dashboard
**Create**: `/dashboard/operations/page.tsx`

Focus:
- Events this week
- Equipment checks needed
- Staff assignments missing
- Logistics planning status

#### 3.3 Customer Success Dashboard
**Create**: `/dashboard/customer-success/page.tsx`

Focus:
- Thank you emails to send
- Feedback requests pending
- Complaints to handle
- Check-in calls due

#### 3.4 Accounting Dashboard
**Create**: `/dashboard/accounting/page.tsx`

Focus:
- Invoices to send
- Payments overdue
- Reconciliations needed
- Refunds to process

---

### Phase 4: Task Integration into Modules (Week 4)

#### 4.1 Auto-Create Tasks on Events

**Update**: Event creation flow

```typescript
// When event is created
async function onEventCreated(event: Event) {
  // Create operations tasks
  await createTask({
    title: `Equipment check for ${event.title}`,
    department: 'operations',
    entity_type: 'event',
    entity_id: event.id,
    priority: 'high',
    due_date: event.start_date - 7 days
  })

  // Create design tasks (if design items exist)
  for (const designItem of event.design_items) {
    await createTask({
      title: `Complete design: ${designItem.name}`,
      department: 'design',
      entity_type: 'design_item',
      entity_id: designItem.id,
      priority: 'high',
      due_date: designItem.design_deadline
    })
  }
}
```

#### 4.2 Auto-Create Tasks on Opportunities

**Update**: Opportunity stage changes

```typescript
// When opportunity moves to "Proposal" stage
if (newStage === 'proposal') {
  await createTask({
    title: `Send quote for ${opportunity.name}`,
    department: 'sales',
    entity_type: 'opportunity',
    entity_id: opportunity.id,
    assigned_to: opportunity.owner_id,
    priority: 'high',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
  })
}

// When opportunity closes won
if (newStage === 'closed_won') {
  await createTask({
    title: `Send invoice for ${opportunity.name}`,
    department: 'accounting',
    entity_type: 'opportunity',
    entity_id: opportunity.id,
    priority: 'urgent',
    due_date: new Date()
  })
}
```

---

### Phase 5: Supervision & Management (Week 5)

#### 5.1 Department Supervisor View

**Create**: `src/components/dashboards/supervisor-panel.tsx`

Features:
- See all team members' tasks
- Reassign tasks
- View team performance metrics
- Workload balancing

#### 5.2 Task Assignment Logic

```typescript
// Smart assignment based on workload
function suggestAssignment(task: Task, department: string): User[] {
  const teamMembers = getUsersByDepartment(department)

  // Sort by current workload
  return teamMembers.sort((a, b) => {
    const aWorkload = getOpenTaskCount(a.id)
    const bWorkload = getOpenTaskCount(b.id)
    return aWorkload - bWorkload
  })
}
```

---

## 🏗️ Implementation Architecture

### ✅ Use SOLID Principles From The Start

Based on Events module patterns:

#### Service Layer
**Create**: `src/lib/api/services/tasksService.ts`

```typescript
export const tasksService = {
  async getByDepartment(department: string, filters?: TaskFilters) {
    const params = new URLSearchParams({ department, ...filters })
    const response = await fetch(`/api/tasks?${params}`)
    return response.json()
  },

  async getMyTasks(userId: string) {
    const response = await fetch(`/api/tasks?assignedTo=${userId}`)
    return response.json()
  },

  async create(task: CreateTaskInput) {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    })
    return response.json()
  },

  async update(taskId: string, updates: Partial<Task>) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    return response.json()
  },

  async delete(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    })
    return response.json()
  }
}
```

#### Custom Hooks
**Create**: `src/hooks/useTaskDashboard.ts`

```typescript
export function useTaskDashboard(department: string, userId?: string) {
  return useQuery({
    queryKey: ['task-dashboard', department, userId],
    queryFn: async () => {
      const params = new URLSearchParams({ department })
      if (userId) params.append('assignedTo', userId)
      const response = await fetch(`/api/tasks/dashboard?${params}`)
      return response.json()
    }
  })
}
```

**Create**: `src/hooks/useTaskActions.ts`

```typescript
export function useTaskActions() {
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string, status: string }) =>
      tasksService.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const reassignTask = useMutation({
    mutationFn: ({ taskId, newAssignee }: { taskId: string, newAssignee: string }) =>
      tasksService.update(taskId, { assigned_to: newAssignee }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dashboard'] })
    }
  })

  return { updateStatus, reassignTask }
}
```

---

## 📊 Database Schema Additions

```sql
-- Task templates for auto-creation
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  department TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title_template TEXT NOT NULL,
  description_template TEXT,
  default_priority TEXT DEFAULT 'medium',
  trigger_event TEXT NOT NULL, -- 'event_created', 'opportunity_won', etc.
  trigger_conditions JSONB,
  due_date_offset_days INTEGER, -- days before/after event
  auto_assign_to TEXT, -- 'owner', 'department_default', specific user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task comments/collaboration
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task history/audit log
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'created', 'status_changed', 'reassigned', etc.
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 Success Metrics

After implementation, you should have:

- ✅ **One unified task system** across all modules
- ✅ **6 department dashboards** (Sales, Design, Operations, Customer Success, Accounting, Admin)
- ✅ **Personalized user dashboard** showing only their tasks
- ✅ **Supervision view** for department managers
- ✅ **Auto-task creation** on key events (event created, opportunity won, etc.)
- ✅ **Task assignment** based on department and workload
- ✅ **Real-time updates** with React Query
- ✅ **Service layer** for all API calls (SOLID-compliant)
- ✅ **Custom hooks** for data fetching (separation of concerns)

---

## 🚀 Recommended Build Order

**Week 1**: Foundation
1. Department configuration
2. Database migrations
3. Update task API with department filtering

**Week 2**: Main Dashboard
4. Unified task dashboard page
5. Department tabs
6. Task KPI cards
7. Task list with filtering/grouping

**Week 3**: Department Dashboards
8. Sales dashboard
9. Operations dashboard
10. Customer Success dashboard
11. Accounting dashboard

**Week 4**: Integration
12. Auto-create tasks on event creation
13. Auto-create tasks on opportunity stage changes
14. Hook into existing workflows

**Week 5**: Management
15. Supervisor panel
16. Task reassignment
17. Team performance metrics
18. Workload balancing

---

## 💡 Key Design Decisions

### 1. Department as Primary Organization
- Tasks belong to departments FIRST
- Users are members of departments
- Dashboards are department-centric

### 2. Entity Linking is Flexible
- Tasks can link to ANY entity (polymorphic)
- Event-specific tasks can link to event_date_id
- Opportunity tasks link to opportunity
- Account tasks link to account

### 3. Auto-Task Creation
- Use task templates
- Trigger on key events
- Smart defaults based on business rules

### 4. Build Using Events Module Patterns
- Service layer for API abstraction
- Custom hooks for data fetching
- React Query for caching and updates
- Component composition for UI

---

## 🤝 This Solves Your Problem

✅ **"1 task system intertwined into every module"**
- Polymorphic entity linking
- Auto-creation on key events
- Unified API and data model

✅ **"Tasks by department with supervision"**
- Department field on tasks and users
- Department-specific dashboards
- Supervisor panel for managers

✅ **"Personalized dashboard for each user"**
- Filter by assigned_to
- Show only user's department(s)
- Prioritize by urgency and due date

✅ **"Department dashboards"**
- 6 pre-built dashboards
- Copy design dashboard pattern
- Customize KPIs per department

---

## 🎓 You'll Learn While Building

By building this (instead of refactoring), you'll learn:

1. **How to structure a complex feature** from the start
2. **Service layer pattern** (you'll see why it's worth it)
3. **Custom hooks for separation** (natural and obvious)
4. **React Query for data management** (caching, refetching, optimistic updates)
5. **Polymorphic relationships** (one task system, many entities)
6. **Department-based authorization** (natural fit for permissions)

And when you're done, you'll have a **killer feature** that makes your CRM stand out!

---

**Ready to start building?** 🚀

Let me know which week/phase you want to start with, and I'll help you build it right the FIRST time using all the good patterns we've learned!
