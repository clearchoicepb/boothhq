# CORE TASKS SYSTEM INVESTIGATION REPORT
**Date:** October 13, 2025
**Purpose:** Understand existing core tasks implementation to integrate operations tasks

---

## EXECUTIVE SUMMARY

The current core tasks system is a **tenant-based, template-driven checklist system** that automatically creates task completion records for each event. Tasks are globally configured per tenant with no event-type specificity or deadline management. To integrate operations tasks, we need to add:
1. Task type categorization (design, sales, operations)
2. Event type filtering
3. Deadline calculation fields
4. Auto-add flag support

---

## 1. MULTI-TENANT SETUP

### ✅ FINDINGS

**Tenants Table Structure:**
- Location: `supabase/migrations/001_complete_schema.sql:43`
- Schema:
  ```sql
  CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    domain TEXT,
    plan TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Tenant Isolation:**
- ✅ `core_task_templates` has `tenant_id` column
- ✅ `event_core_task_completion` has `tenant_id` column
- ✅ All queries filter by `session.user.tenantId`
- ✅ Foreign keys enforce tenant relationships
- ✅ RLS is DISABLED (uses NextAuth instead of Supabase Auth)

**Session Structure:**
- Session object includes: `session.user.tenantId`
- Location: `src/lib/auth.ts`
- Used in all API routes for tenant filtering

### 📊 STATUS: ✅ FULLY IMPLEMENTED

---

## 2. CORE TASKS DATA STRUCTURE

### ✅ FINDINGS

**Migration File:** `supabase/migrations/20250212000001_create_core_tasks_system.sql`

**Table 1: core_task_templates**
```sql
CREATE TABLE core_task_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task details
  task_name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, display_order)
);
```

**Indexes:**
- `idx_core_task_templates_tenant_id`
- `idx_core_task_templates_display_order`

**Table 2: event_core_task_completion**
```sql
CREATE TABLE event_core_task_completion (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  core_task_template_id UUID NOT NULL REFERENCES core_task_templates(id) ON DELETE CASCADE,

  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(event_id, core_task_template_id)
);
```

**Indexes:**
- `idx_event_core_task_completion_event_id`
- `idx_event_core_task_completion_tenant_id`

**Default Tasks (Hardcoded):**
```javascript
default_tasks = [
  'Photo Strip Design Approval',
  'Event Staff Assigned',
  'Event Logistics Received',
  'Event Setup in Software',
  'Payment Received'
]
```

### ❌ GAPS FOR OPERATIONS TASKS

**Missing Columns in `core_task_templates`:**
1. ❌ `task_type` VARCHAR(50) - to categorize (design, sales, operations)
2. ❌ `applies_to_event_types` TEXT[] - to filter which event types get this task
3. ❌ `days_before_event` INTEGER - for deadline calculation
4. ❌ `auto_added` BOOLEAN - flag if task should auto-generate
5. ❌ `description` TEXT - additional task details
6. ❌ `assigned_role` VARCHAR(50) - default assignee role

**Missing in `event_core_task_completion`:**
1. ❌ `due_date` DATE - calculated deadline for this task
2. ❌ `assigned_to` UUID - user assigned to complete this task

---

## 3. CORE TASKS SETTINGS UI

### ✅ FINDINGS

**Location:** `src/app/[tenant]/settings/core-tasks/page.tsx`

**Current Capabilities:**
- ✅ List all core task templates
- ✅ Add new task templates
- ✅ Edit task names
- ✅ Toggle active/inactive status
- ✅ Reorder tasks (display_order)
- ✅ Delete tasks (via deactivation)
- ✅ Admin-only editing (checks `session.user.role === 'admin'`)

**UI Components:**
```typescript
interface CoreTaskTemplate {
  id: string
  task_name: string
  display_order: number
  is_active: boolean
}
```

**API Endpoints Used:**
- `GET /api/core-task-templates` - Fetch all templates
- `POST /api/core-task-templates` - Create new template
- `PATCH /api/core-task-templates` - Update templates (batch update)

### ❌ GAPS FOR OPERATIONS TASKS

**Missing UI Fields:**
1. ❌ Task Type dropdown (Design, Sales, Operations)
2. ❌ Applies to Event Types multi-select
3. ❌ Days Before Event input
4. ❌ Auto-add checkbox
5. ❌ Description textarea
6. ❌ Assigned Role dropdown

**Missing Features:**
- ❌ Filter templates by task_type
- ❌ Preview which events will get this task
- ❌ Bulk operations on templates

---

## 4. TASK AUTO-GENERATION SYSTEM

### ✅ FINDINGS

**Automatic Task Creation:**
- **Trigger:** Database trigger on `events` table INSERT
- **Function:** `initialize_event_core_tasks()`
- **Location:** `supabase/migrations/20250212000001_create_core_tasks_system.sql:92-109`

```sql
CREATE OR REPLACE FUNCTION initialize_event_core_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert completion records for all active core tasks for this tenant
  INSERT INTO event_core_task_completion (tenant_id, event_id, core_task_template_id, is_completed)
  SELECT NEW.tenant_id, NEW.id, id, false
  FROM core_task_templates
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_event_core_tasks
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION initialize_event_core_tasks();
```

**How It Works:**
1. New event is created
2. Trigger fires AFTER INSERT
3. Function selects ALL active templates for tenant
4. Creates completion records for each template
5. All start as `is_completed = false`

**Backfill Support:**
- File: `supabase/migrations/20250212000002_backfill_core_tasks_for_existing_events.sql`
- Backfills completion records for pre-existing events

**Manual Initialization:**
- API: `POST /api/events/{id}/core-tasks/initialize`
- Used when completion records are missing

### ❌ GAPS FOR OPERATIONS TASKS

**Current Issues:**
1. ❌ No event_type filtering - ALL tasks added to ALL events
2. ❌ No deadline calculation - no `due_date` set
3. ❌ No auto_added flag check - all active tasks are added
4. ❌ No conditional logic based on task_type
5. ❌ No assignment of tasks to roles

**Required Changes:**
- Modify `initialize_event_core_tasks()` function to:
  1. Filter by `applies_to_event_types` matching `events.event_type`
  2. Check `auto_added = true`
  3. Calculate `due_date` using `days_before_event`
  4. Set `assigned_to` based on `assigned_role`

---

## 5. TASK COMPLETION TRACKING

### ✅ FINDINGS

**Frontend Component:** `src/components/event-core-tasks-checklist.tsx`

**Display Location:**
- Event detail page: `src/app/[tenant]/events/[id]/page.tsx:25`
- Rendered horizontally at top of event page
- Shows "Ready for Event" banner when all complete

**Completion Flow:**
1. Component fetches: `GET /api/events/{id}/core-tasks`
2. User clicks checkbox
3. Sends: `PATCH /api/events/{id}/core-tasks`
4. Updates: `is_completed`, `completed_at`, `completed_by`
5. Refetches and shows updated state

**API Route:** `src/app/api/events/[id]/core-tasks/route.ts`

**GET Endpoint:**
```typescript
.select(`
  *,
  core_task_template:core_task_templates(
    id,
    task_name,
    display_order
  ),
  completed_by_user:users!event_core_task_completion_completed_by_fkey(
    id,
    first_name,
    last_name
  )
`)
.eq('event_id', eventId)
.eq('tenant_id', session.user.tenantId)
.order('core_task_template(display_order)', { ascending: true })
```

**PATCH Endpoint:**
```typescript
const updateData = {
  is_completed,
  completed_at: is_completed ? new Date().toISOString() : null,
  completed_by: is_completed ? session.user.id : null
}
```

**UI Features:**
- Grid layout (1-5 columns responsive)
- Checkmark icon when complete
- Green styling for completed tasks
- "Ready for Event" banner when 100% complete
- Progress indicator

### ❌ GAPS FOR OPERATIONS TASKS

**Missing Features:**
1. ❌ Due date display
2. ❌ Overdue highlighting
3. ❌ Task assignment display
4. ❌ Task type grouping/filtering
5. ❌ Task descriptions/tooltips
6. ❌ Task priority sorting
7. ❌ Bulk complete actions

---

## 6. EVENT TYPES CONFIGURATION

### ✅ FINDINGS

**Events Table:**
- Column: `event_type TEXT NOT NULL`
- Location: `supabase/migrations/001_complete_schema.sql:164`
- NO CHECK constraint (accepts any text value)

**Current Event Types:**
Source: `src/components/forms/configs/eventFormConfig.ts:19-27`
```typescript
options: [
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'birthday', label: 'Birthday Party' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'holiday', label: 'Holiday Party' },
  { value: 'other', label: 'Other' }
]
```

**Event Types in Use:**
- `wedding` - Social event
- `corporate` - Corporate event
- `birthday` - Social event
- `anniversary` - Social event
- `graduation` - Social event
- `holiday` - Social/corporate event
- `other` - Catch-all

**Alternative Event Types in Other Forms:**
- New event page: `photo_booth`, `photography`, `videography`, `other`
- Shows inconsistency in event type values

### ❌ GAPS FOR OPERATIONS TASKS

**Issues:**
1. ❌ No standardized event type values (inconsistent across forms)
2. ❌ No "marketing" event type (mentioned in requirements)
3. ❌ No event type grouping (social vs corporate vs marketing)
4. ❌ No CHECK constraint on event_type column

**Recommended Event Types:**
```typescript
// Social Events
'wedding', 'birthday', 'anniversary', 'graduation', 'bar_mitzvah', 'quinceañera'

// Corporate Events
'corporate', 'conference', 'trade_show', 'team_building', 'holiday_party'

// Marketing Events
'marketing_activation', 'brand_activation', 'product_launch', 'promotional_event'

// Other
'photo_booth', 'photography', 'videography', 'other'
```

---

## 7. INTEGRATION PLAN FOR OPERATIONS TASKS

### PHASE 1: DATABASE SCHEMA UPDATES

**Migration: `add_task_type_and_filtering_to_core_tasks.sql`**

```sql
-- Add new columns to core_task_templates
ALTER TABLE core_task_templates
  ADD COLUMN task_type VARCHAR(50) DEFAULT 'design',
  ADD COLUMN applies_to_event_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN days_before_event INTEGER,
  ADD COLUMN auto_added BOOLEAN DEFAULT true,
  ADD COLUMN description TEXT,
  ADD COLUMN assigned_role VARCHAR(50);

-- Add check constraint
ALTER TABLE core_task_templates
  ADD CONSTRAINT valid_task_type
  CHECK (task_type IN ('design', 'sales', 'operations'));

-- Add new columns to event_core_task_completion
ALTER TABLE event_core_task_completion
  ADD COLUMN due_date DATE,
  ADD COLUMN assigned_to UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX idx_core_task_templates_task_type
  ON core_task_templates(task_type);

CREATE INDEX idx_event_core_task_completion_due_date
  ON event_core_task_completion(due_date);

CREATE INDEX idx_event_core_task_completion_assigned_to
  ON event_core_task_completion(assigned_to);

-- Update existing tasks to have task_type = 'design'
UPDATE core_task_templates SET task_type = 'design' WHERE task_type IS NULL;
```

### PHASE 2: UPDATE AUTO-GENERATION FUNCTION

**Migration: `update_core_tasks_initialization_function.sql`**

```sql
CREATE OR REPLACE FUNCTION initialize_event_core_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert completion records for tasks that:
  -- 1. Are active
  -- 2. Are auto_added
  -- 3. Match the event's event_type (or have empty filter)
  INSERT INTO event_core_task_completion (
    tenant_id,
    event_id,
    core_task_template_id,
    is_completed,
    due_date,
    assigned_to
  )
  SELECT
    NEW.tenant_id,
    NEW.id,
    ct.id,
    false,
    -- Calculate due_date if days_before_event is set
    CASE
      WHEN ct.days_before_event IS NOT NULL
      THEN (NEW.event_date - (ct.days_before_event || ' days')::INTERVAL)::DATE
      ELSE NULL
    END,
    -- Find user with assigned_role (if specified)
    (SELECT u.id FROM users u
     WHERE u.tenant_id = NEW.tenant_id
     AND u.role = ct.assigned_role
     LIMIT 1)
  FROM core_task_templates ct
  WHERE ct.tenant_id = NEW.tenant_id
    AND ct.is_active = true
    AND ct.auto_added = true
    AND (
      ct.applies_to_event_types = ARRAY[]::TEXT[] OR
      NEW.event_type = ANY(ct.applies_to_event_types)
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### PHASE 3: INSERT OPERATIONS TASKS

**Migration: `insert_operations_core_tasks.sql`**

```sql
-- Insert operations tasks for all tenants
DO $$
DECLARE
  tenant_record RECORD;
  max_order INTEGER;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    -- Get highest display_order
    SELECT COALESCE(MAX(display_order), 0) INTO max_order
    FROM core_task_templates WHERE tenant_id = tenant_record.id;

    -- Design Form Submitted (Social Events)
    INSERT INTO core_task_templates (
      tenant_id, task_name, display_order, task_type,
      applies_to_event_types, days_before_event, auto_added, description
    ) VALUES (
      tenant_record.id,
      'Design Form Submitted',
      max_order + 1,
      'operations',
      ARRAY['wedding', 'birthday', 'anniversary', 'graduation'],
      14,
      true,
      'Client has submitted design preferences form'
    );

    -- Event Brief Created (Marketing Events)
    INSERT INTO core_task_templates (
      tenant_id, task_name, display_order, task_type,
      applies_to_event_types, days_before_event, auto_added, description
    ) VALUES (
      tenant_record.id,
      'Event Brief Created',
      max_order + 2,
      'operations',
      ARRAY['marketing_activation', 'brand_activation', 'product_launch'],
      21,
      true,
      'Event brief document has been created and approved'
    );

    -- Logistics Form Submitted
    INSERT INTO core_task_templates (
      tenant_id, task_name, display_order, task_type,
      applies_to_event_types, days_before_event, auto_added, description
    ) VALUES (
      tenant_record.id,
      'Logistics Form Submitted',
      max_order + 3,
      'operations',
      ARRAY[]::TEXT[], -- Applies to all event types
      7,
      true,
      'Client has submitted logistics and venue details form'
    );

    -- Final Confirmation Sent
    INSERT INTO core_task_templates (
      tenant_id, task_name, display_order, task_type,
      applies_to_event_types, days_before_event, auto_added, description
    ) VALUES (
      tenant_record.id,
      'Final Confirmation Sent',
      max_order + 4,
      'operations',
      ARRAY[]::TEXT[],
      3,
      true,
      'Final confirmation email sent to client'
    );

    -- Staff Notified
    INSERT INTO core_task_templates (
      tenant_id, task_name, display_order, task_type,
      applies_to_event_types, days_before_event, auto_added, description
    ) VALUES (
      tenant_record.id,
      'Staff Notified',
      max_order + 5,
      'operations',
      ARRAY[]::TEXT[],
      2,
      true,
      'Event staff has been notified and confirmed availability'
    );

  END LOOP;
END $$;
```

### PHASE 4: UPDATE SETTINGS UI

**File: `src/app/[tenant]/settings/core-tasks/page.tsx`**

**Changes Required:**
1. Add task_type dropdown to template form
2. Add event types multi-select
3. Add days_before_event number input
4. Add auto_added checkbox
5. Add description textarea
6. Add tabs to filter by task_type (Design | Sales | Operations)
7. Update API calls to include new fields

**New Interface:**
```typescript
interface CoreTaskTemplate {
  id: string
  task_name: string
  display_order: number
  is_active: boolean
  task_type: 'design' | 'sales' | 'operations'
  applies_to_event_types: string[]
  days_before_event: number | null
  auto_added: boolean
  description: string | null
  assigned_role: string | null
}
```

### PHASE 5: UPDATE API ROUTES

**Files to Update:**
1. `src/app/api/core-task-templates/route.ts`
   - Add new fields to GET response
   - Add new fields to POST validation
   - Add new fields to PATCH update

2. `src/app/api/events/[id]/core-tasks/route.ts`
   - Include `due_date` in GET response
   - Include `assigned_to` in GET response
   - Add sorting by due_date

### PHASE 6: UPDATE FRONTEND COMPONENTS

**File: `src/components/event-core-tasks-checklist.tsx`**

**Enhancements:**
1. Group tasks by task_type
2. Show due dates
3. Highlight overdue tasks
4. Show assigned users
5. Add tooltips with descriptions
6. Add filtering/sorting options

---

## SUMMARY OF CHANGES NEEDED

### Database Migrations (3 files)
1. ✅ `add_task_type_and_filtering_to_core_tasks.sql`
2. ✅ `update_core_tasks_initialization_function.sql`
3. ✅ `insert_operations_core_tasks.sql`

### API Routes (2 files)
1. ✅ Update `src/app/api/core-task-templates/route.ts`
2. ✅ Update `src/app/api/events/[id]/core-tasks/route.ts`

### Frontend Components (2 files)
1. ✅ Update `src/app/[tenant]/settings/core-tasks/page.tsx`
2. ✅ Update `src/components/event-core-tasks-checklist.tsx`

### Event Type Standardization (1 migration)
1. ✅ `standardize_event_types.sql` - Add CHECK constraint

---

## NEXT STEPS

1. ✅ Create database migrations
2. ✅ Update API routes to handle new fields
3. ✅ Update settings UI with new form fields
4. ✅ Update event detail checklist component
5. ✅ Test with existing events
6. ✅ Backfill due_dates for existing completion records
7. ✅ Document new task configuration process

---

## NOTES

- Current system is well-structured and extensible
- Multi-tenant isolation is properly implemented
- Auto-generation trigger is elegant and efficient
- Main gaps are in filtering and deadline management
- Operations tasks can be added with minimal disruption
- Existing "design" tasks should continue to work unchanged
