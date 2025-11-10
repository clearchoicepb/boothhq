# Refactored Modal Configuration Pattern - Complete Guide

## Overview
The application uses a sophisticated pattern combining:
1. **Generic Form Configuration System** - Declarative schema-based forms
2. **Reusable Modal Components** - Built on a base Modal component
3. **Custom Hooks** - For state management and data fetching
4. **React Query** - For data caching and mutations
5. **API Routes** - With tenant isolation and multi-tenancy support

---

## 1. MODAL COMPONENT STRUCTURE

### Base Modal Component
**File**: `/home/user/boothhq/src/components/ui/modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  // Handles ESC key, body overflow, backdrop overlay
}
```

**Key Features:**
- Simple, reusable base component
- Supports ESC key to close
- Prevents body scrolling when open
- Customizable width via className (e.g., "sm:max-w-md")

---

## 2. MODAL CONFIGURATION PATTERN

### Real Example: Assign Staff Modal
**File**: `/home/user/boothhq/src/components/events/assign-staff-modal.tsx`

This modal demonstrates the **specialized modal pattern**:

```typescript
interface AssignStaffModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  editingStaffId: string | null
  
  // Form state from parent hook
  selectedUserId: string
  setSelectedUserId: (id: string) => void
  selectedStaffRoleId: string
  setSelectedStaffRoleId: (id: string) => void
  selectedDateTimes: DateTimeSelection[]
  setSelectedDateTimes: (dates: DateTimeSelection[]) => void
  staffNotes: string
  setStaffNotes: (notes: string) => void
  
  // Data
  users: User[]
  staffRoles: StaffRole[]
  eventDates: EventDate[]
}

export function AssignStaffModal({
  isOpen,
  onClose,
  onSubmit,
  // ... all props destructured
}: AssignStaffModalProps) {
  // Conditional rendering based on role type
  const isEventStaffRole = selectedRole?.type === 'event_staff'
  
  // Complex UI logic with conditional sections
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="...">
      {/* Selects, checkboxes, time inputs, etc. */}
    </Modal>
  )
}
```

**Key Pattern:**
- All state managed by **parent component** via hooks
- Modal is a **dumb presentational component**
- Handlers passed as props
- Conditional rendering based on data (role types)

---

## 3. FORM CONFIGURATION SYSTEM

### Form Configuration Types
**File**: `/home/user/boothhq/src/components/forms/types.ts`

```typescript
export interface FieldConfig {
  name: string
  type: 'text' | 'email' | 'select' | 'textarea' | 'date' | 'datetime' | ...
  label: string
  required?: boolean
  placeholder?: string
  options?: SelectOption[] | string // string for dynamic options
  validation?: ValidationRule
  gridCols?: 1 | 2 | 3 | 4
  section?: string
  conditional?: ConditionalRule
}

export interface FormConfig<T = any> {
  entity: string
  fields: FieldConfig[]
  validation?: Record<string, ValidationRule>
  relatedData?: RelatedDataConfig[] // For fetching dropdown options
  defaultValues: Partial<T>
  sections?: FormSection[]
}
```

### Inventory Form Configuration Example
**File**: `/home/user/boothhq/src/components/forms/configs/inventoryFormConfig.ts`

```typescript
export const inventoryFormConfig: FormConfig<any> = {
  entity: 'inventory',
  fields: [
    {
      name: 'item_id',
      type: 'text',
      label: 'Item ID',
      placeholder: 'e.g., C107, HS111',
      required: true,
      gridCols: 1
    },
    {
      name: 'name',
      type: 'text',
      label: 'Equipment Name',
      required: true,
      gridCols: 1
    },
    {
      name: 'equipment_type',
      type: 'select',
      label: 'Equipment Type',
      required: true,
      options: [
        { value: 'Camera', label: 'Camera' },
        { value: 'iPad', label: 'iPad' },
        { value: 'Printer', label: 'Printer' },
        // ...
      ],
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      options: [
        { value: 'available', label: 'Available' },
        { value: 'assigned_to_booth', label: 'Assigned to Booth' },
        { value: 'deployed', label: 'Deployed' },
        // ...
      ],
      gridCols: 1
    },
    {
      name: 'condition',
      type: 'select',
      label: 'Condition',
      required: true,
      options: [
        { value: 'excellent', label: 'Excellent' },
        { value: 'good', label: 'Good' },
        // ...
      ],
      gridCols: 1
    },
    {
      name: 'purchase_date',
      type: 'date',
      label: 'Purchase Date',
      gridCols: 1
    },
    {
      name: 'purchase_price',
      type: 'number',
      label: 'Purchase Price',
      validation: { min: 0 },
      gridCols: 1
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      gridCols: 2
    }
  ],
  defaultValues: {
    status: 'available',
    condition: 'good'
  }
}
```

### Form Configuration Registration
**File**: `/home/user/boothhq/src/components/forms/configs/index.ts`

```typescript
export const entityConfigs = {
  contacts: contactFormConfig,
  accounts: accountFormConfig,
  events: eventFormConfig,
  opportunities: opportunityFormConfig,
  inventory: inventoryFormConfig,
  // ... other entities
} as const

export type EntityType = keyof typeof entityConfigs

export function getFormConfig<T>(entity: EntityType): FormConfig<T> {
  const config = entityConfigs[entity]
  if (!config) {
    throw new Error(`No form configuration found for entity: ${entity}`)
  }
  return config as FormConfig<T>
}
```

---

## 4. GENERIC FORM COMPONENT

### EntityForm - Dynamic Form from Config
**File**: `/home/user/boothhq/src/components/forms/EntityForm.tsx`

```typescript
interface EntityFormProps<T = any> extends Omit<BaseFormProps<T>, 'config'> {
  entity: EntityType
}

export function EntityForm<T extends Record<string, any>>({
  entity,
  ...props
}: EntityFormProps<T>) {
  const config = getFormConfig<T>(entity)
  return <BaseForm config={config} {...props} />
}
```

**Usage in InventoryForm**:
```typescript
export function InventoryForm({ equipment, isOpen, onClose, onSubmit }: InventoryFormProps) {
  return (
    <EntityForm
      entity="inventory"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={equipment || undefined}
      title={equipment ? 'Edit Equipment' : 'New Equipment'}
      submitLabel={equipment ? 'Update Equipment' : 'Create Equipment'}
    />
  )
}
```

---

## 5. STATE MANAGEMENT HOOKS

### useEventModals - Modal State Hook
**File**: `/home/user/boothhq/src/hooks/useEventModals.ts`

```typescript
export function useEventModals() {
  // Task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [tasksKey, setTasksKey] = useState(0)
  
  // Communication modals
  const [isLogCommunicationModalOpen, setIsLogCommunicationModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false)
  
  // Detail modals with selected items
  const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
  const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)
  
  // ... more modals
  
  // Control functions
  const openTaskModal = useCallback(() => {
    setIsTaskModalOpen(true)
  }, [])
  
  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false)
  }, [])
  
  // ... more handlers
  
  const closeAllModals = useCallback(() => {
    // Reset all modal states at once
  }, [])
  
  return {
    // Modal states
    isTaskModalOpen,
    setIsTaskModalOpen,
    // ... all states and handlers
    closeAllModals,
  }
}
```

### useEventStaff - Staff Management Hook
**File**: `/home/user/boothhq/src/hooks/useEventStaff.ts`

```typescript
export function useEventStaff(
  eventId: string,
  session?: any,
  tenant?: any
) {
  // Add staff form state
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedStaffRoleId, setSelectedStaffRoleId] = useState<string>('')
  const [staffNotes, setStaffNotes] = useState<string>('')
  const [selectedDateTimes, setSelectedDateTimes] = useState<Array<{
    dateId: string
    startTime: string
    endTime: string
  }>>([])
  
  // React Query hooks for data
  const staffQuery = useEventStaffData(eventId)
  const usersQuery = useUsers()
  const staffRolesQuery = useStaffRoles(true)
  
  // React Query mutations
  const addStaffMutation = useAddEventStaff(eventId)
  const updateStaffMutation = useUpdateEventStaff(eventId)
  const removeStaffMutation = useRemoveEventStaff(eventId)
  
  const addStaff = useCallback(async (staffData: any) => {
    await addStaffMutation.mutateAsync(staffData)
  }, [addStaffMutation])
  
  const resetAddStaffForm = useCallback(() => {
    setIsAddingStaff(false)
    setSelectedUserId('')
    setSelectedStaffRoleId('')
    setStaffNotes('')
    setSelectedDateTimes([])
  }, [])
  
  return {
    // Data
    staffAssignments: staffQuery.data ?? [],
    users: usersQuery.data ?? [],
    staffRoles: staffRolesQuery.data ?? [],
    loadingStaff: staffQuery.isLoading || usersQuery.isLoading || staffRolesQuery.isLoading,
    
    // Form state
    isAddingStaff,
    setIsAddingStaff,
    selectedUserId,
    setSelectedUserId,
    // ... all form state
    
    // CRUD operations
    addStaff,
    updateStaff,
    removeStaff,
    resetAddStaffForm,
  }
}
```

### React Query Data Hooks
**File**: `/home/user/boothhq/src/hooks/useEventStaffData.ts`

```typescript
async function fetchEventStaff(eventId: string): Promise<any[]> {
  const response = await fetch(`/api/event-staff?event_id=${eventId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch event staff')
  }
  return response.json()
}

export function useEventStaffData(eventId: string) {
  return useQuery({
    queryKey: ['event-staff', eventId],
    queryFn: () => fetchEventStaff(eventId),
    staleTime: 30 * 1000,
    enabled: Boolean(eventId),
  })
}

export function useAddEventStaff(eventId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (staffData: any) => {
      const response = await fetch('/api/event-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      if (!response.ok) throw new Error('Failed to add staff')
      return response.json()
    },
    onSuccess: () => {
      // Invalidate cache so data refetches
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })
    }
  })
}

export function useUpdateEventStaff(eventId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ staffId, staffData }: { staffId: string; staffData: any }) => {
      const response = await fetch(`/api/event-staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      if (!response.ok) throw new Error('Failed to update staff')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })
    }
  })
}

export function useRemoveEventStaff(eventId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (staffId: string) => {
      const response = await fetch(`/api/event-staff/${staffId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to remove staff')
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })
    }
  })
}
```

---

## 6. API ROUTES PATTERN

### GET - Fetch data with tenant isolation
**File**: `/home/user/boothhq/src/app/api/event-staff/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context
    
    const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    
    let query = supabase
      .from('event_staff_assignments')
      .select(`
        *,
        users!event_staff_assignments_user_id_fkey (id, first_name, last_name, email, role),
        event_dates!event_staff_assignments_event_date_id_fkey (id, event_date, start_time, end_time),
        staff_roles!event_staff_assignments_staff_role_id_fkey (id, name, type)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })
    
    if (eventId) {
      query = query.eq('event_id', eventId)
    }
    
    const { data, error } = await query
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch event staff',
        details: error.message,
      }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Key Features:**
- `getTenantContext()` - Extracts tenant from session
- `dataSourceTenantId` - Ensures tenant isolation
- Selects with joins to related data
- Error handling with meaningful messages

### POST - Create with tenant context
**File**: `/home/user/boothhq/src/app/api/event-staff/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context
    
    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const staffData = {
      ...body,
      tenant_id: dataSourceTenantId // Auto-inject tenant
    }
    
    const { data, error } = await supabase
      .from('event_staff_assignments')
      .insert(staffData)
      .select(`
        *,
        users!event_staff_assignments_user_id_fkey (...),
        event_dates!event_staff_assignments_event_date_id_fkey (...),
        staff_roles!event_staff_assignments_staff_role_id_fkey (...)
      `)
      .single()
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to create event staff assignment',
        details: error.message,
      }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### PUT - Update with tenant isolation
**File**: `/home/user/boothhq/src/app/api/event-staff/[id]/route.ts`

```typescript
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context
    
    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const staffAssignmentId = params.id
    const body = await request.json()
    
    const updateData: any = {}
    if (body.staff_role_id !== undefined) updateData.staff_role_id = body.staff_role_id
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.notes !== undefined) updateData.notes = body.notes
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('event_staff_assignments')
      .update(updateData)
      .eq('id', staffAssignmentId)
      .eq('tenant_id', dataSourceTenantId) // Ensure tenant isolation
      .select(...)
      .single()
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to update event staff assignment',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### DELETE - Remove with tenant isolation
**File**: `/home/user/boothhq/src/app/api/event-staff/[id]/route.ts`

```typescript
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context
    
    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const staffAssignmentId = params.id
    
    const { error } = await supabase
      .from('event_staff_assignments')
      .delete()
      .eq('id', staffAssignmentId)
      .eq('tenant_id', dataSourceTenantId) // Ensure tenant isolation
    
    if (error) {
      return NextResponse.json({
        error: 'Failed to delete event staff assignment',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 7. DATABASE SCHEMA PATTERNS

### Equipment/Inventory Table
**File**: `/home/user/boothhq/supabase/migrations/20250210000001_create_equipment_items.sql`

```sql
CREATE TABLE IF NOT EXISTS equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  item_id VARCHAR(50) NOT NULL, -- User-friendly ID like C107, HS111
  equipment_type VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  
  -- Tracking
  serial_number VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  location VARCHAR(255),
  
  -- Assignment
  booth_id UUID REFERENCES booths(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  assigned_date TIMESTAMPTZ,
  
  -- Condition & Maintenance
  condition VARCHAR(50) DEFAULT 'good',
  notes TEXT,
  last_checked_date TIMESTAMPTZ,
  
  -- Metadata for flexibility
  metadata JSONB DEFAULT '{}',
  
  -- Optional
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(tenant_id, item_id)
);

-- Indexes for performance
CREATE INDEX idx_equipment_items_tenant ON equipment_items(tenant_id);
CREATE INDEX idx_equipment_items_status ON equipment_items(status);
CREATE INDEX idx_equipment_items_booth ON equipment_items(booth_id);
CREATE INDEX idx_equipment_items_type ON equipment_items(equipment_type);
CREATE INDEX idx_equipment_items_event ON equipment_items(assigned_to_event_id);

-- Row Level Security
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment in their tenant"
  ON equipment_items FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert equipment in their tenant"
  ON equipment_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update equipment in their tenant"
  ON equipment_items FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete equipment in their tenant"
  ON equipment_items FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**Key Patterns:**
- `tenant_id` on every table for multi-tenancy
- `UNIQUE(tenant_id, item_id)` - tenant-scoped unique constraints
- Foreign keys with CASCADE or SET NULL
- Indexes on tenant_id and frequently queried fields
- Row Level Security (RLS) for tenant isolation

### Event Staff Assignments Table
**File**: `/home/user/boothhq/supabase/migrations/20250208000000_create_event_staff_assignments.sql`

```sql
CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Relations
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date_id UUID REFERENCES event_dates(id) ON DELETE CASCADE,
  
  -- Assignment details
  role VARCHAR(100),
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, event_id, user_id, event_date_id)
);

-- Indexes
CREATE INDEX idx_event_staff_tenant_id ON event_staff_assignments(tenant_id);
CREATE INDEX idx_event_staff_event_id ON event_staff_assignments(event_id);
CREATE INDEX idx_event_staff_user_id ON event_staff_assignments(user_id);
CREATE INDEX idx_event_staff_event_date_id ON event_staff_assignments(event_date_id);
CREATE INDEX idx_event_staff_created_at ON event_staff_assignments(created_at DESC);

-- RLS
ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_event_staff ON event_staff_assignments
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Trigger for updated_at
CREATE TRIGGER update_event_staff_assignments_updated_at
  BEFORE UPDATE ON event_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Key Patterns:**
- `event_date_id` NULL for event-wide assignments
- Unique constraint prevents duplicate assignments
- Tenant-scoped RLS policy via JWT token
- Automatic `updated_at` trigger

---

## 8. COMPLETE USAGE EXAMPLE

### How It All Works Together in Event Detail Page
**File**: `/home/user/boothhq/src/app/[tenant]/events/[id]/page.tsx`

```typescript
function EventDetailContent({ eventData }: EventDetailContentProps) {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const params = useParams()
  const eventId = params.id as string
  
  // 1. Initialize the hook - gets all state and data
  const staff = useEventStaff(eventId, session, tenant)
  
  // Destructure what we need
  const {
    staffAssignments,
    users,
    staffRoles,
    loadingStaff,
    isAddingStaff,
    setIsAddingStaff,
    selectedUserId,
    setSelectedUserId,
    selectedStaffRoleId,
    setSelectedStaffRoleId,
    selectedDateTimes,
    setSelectedDateTimes,
    staffNotes,
    setStaffNotes,
    editingStaffId,
    setEditingStaffId,
    addStaff,
    removeStaff,
    resetAddStaffForm
  } = staff
  
  // 2. Handle staff submission
  const handleAddStaff = async () => {
    try {
      // Build the payload
      const staffData = {
        event_id: eventId,
        user_id: selectedUserId,
        staff_role_id: selectedStaffRoleId,
        notes: staffNotes,
        // For event_staff roles, include date/time assignments
        ...(isEventStaffRole && {
          event_date_assignments: selectedDateTimes
        })
      }
      
      if (editingStaffId) {
        await updateStaff(editingStaffId, staffData)
      } else {
        await addStaff(staffData)
      }
      
      toast.success('Staff assignment saved')
      resetAddStaffForm()
    } catch (error) {
      toast.error('Failed to save staff assignment')
    }
  }
  
  // 3. Render the modal
  return (
    <>
      {/* ... other JSX ... */}
      
      <AssignStaffModal
        isOpen={isAddingStaff}
        onClose={() => {
          setIsAddingStaff(false)
          setEditingStaffId(null)
          setSelectedUserId('')
          setSelectedStaffRoleId('')
          setSelectedDateTimes([])
          setStaffNotes('')
        }}
        onSubmit={handleAddStaff}
        editingStaffId={editingStaffId}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        selectedStaffRoleId={selectedStaffRoleId}
        setSelectedStaffRoleId={setSelectedStaffRoleId}
        selectedDateTimes={selectedDateTimes}
        setSelectedDateTimes={setSelectedDateTimes}
        staffNotes={staffNotes}
        setStaffNotes={setStaffNotes}
        users={users}
        staffRoles={staffRoles}
        eventDates={eventData?.eventDates || []}
      />
      
      {/* Display the staff list */}
      <EventStaffList
        staffAssignments={staffAssignments}
        users={users}
        staffRoles={staffRoles}
        eventDates={eventData?.eventDates || []}
        loading={loadingStaff}
        isAddingStaff={isAddingStaff}
        selectedUserId={selectedUserId}
        selectedStaffRoleId={selectedStaffRoleId}
        // ... more props
        onRemoveStaff={removeStaff}
        onStartAdding={() => setIsAddingStaff(true)}
        onCancelAdding={() => {
          resetAddStaffForm()
          setEditingStaffId(null)
        }}
      />
    </>
  )
}
```

---

## 9. MULTI-TENANCY IMPLEMENTATION

### Key Tenant Isolation Points:

1. **API Routes** - Always filter by `tenant_id`
   ```typescript
   .eq('tenant_id', dataSourceTenantId)
   ```

2. **Database RLS** - Enforced at the database level
   ```sql
   USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
   ```

3. **Form Data** - Auto-inject tenant_id
   ```typescript
   const staffData = {
     ...body,
     tenant_id: dataSourceTenantId
   }
   ```

4. **Unique Constraints** - Scoped to tenant
   ```sql
   UNIQUE(tenant_id, item_id)
   ```

5. **Queries** - Always include tenant filter
   ```typescript
   query = query.eq('tenant_id', dataSourceTenantId)
   ```

---

## 10. ARCHITECTURE SUMMARY

```
Event Detail Page
    ↓
useEventStaff Hook (state + data management)
    ├→ useEventStaffData (React Query)
    ├→ useUsers (React Query)
    ├→ useStaffRoles (React Query)
    ├→ useAddEventStaff (React Query mutation)
    ├→ useUpdateEventStaff (React Query mutation)
    └→ useRemoveEventStaff (React Query mutation)
    
AssignStaffModal Component (presentation)
    ├→ Receives all state via props
    ├→ Handles user interactions
    └→ Calls onSubmit with data
    
API Route: /api/event-staff
    ├→ GET: Fetch with tenant isolation
    ├→ POST: Create with auto-injected tenant_id
    ├→ PUT: Update with tenant check
    └→ DELETE: Remove with tenant check
    
Supabase Database
    ├→ event_staff_assignments table
    ├→ Row Level Security policies
    └→ Indexes for performance
```

---

## Summary of Key Patterns

1. **Declarative Forms**: Define forms as configuration objects
2. **Generic Components**: Reusable EntityForm wraps FieldConfig
3. **Separation of Concerns**:
   - Hooks: State + data management
   - Components: UI presentation
   - API Routes: Business logic + validation
4. **React Query**: Caching, mutations, invalidation
5. **Tenant Isolation**:
   - Explicit filters in queries
   - RLS at database level
   - Auto-inject tenant_id in mutations
6. **Specialized Modals**: Inherit from base Modal, implement custom logic
7. **Type Safety**: Full TypeScript support throughout

This pattern is highly reusable and easy to extend to new entities like the inventory system!
