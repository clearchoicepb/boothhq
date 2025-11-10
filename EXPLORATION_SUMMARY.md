# Codebase Exploration Summary

## What Was Explored

Comprehensive exploration of the refactored modal configuration pattern and related systems in the Boothhq project.

## Key Discoveries

### 1. Refactored Modal Configuration System

The codebase uses a sophisticated, reusable pattern for building forms and modals:

**Pattern Components:**
- Base Modal component (simple, reusable wrapper)
- Form Configuration system (declarative schema-based)
- Generic Form Component (EntityForm)
- State Management Hooks (with React Query)
- API Routes (with tenant isolation)
- Database Schema (with multi-tenancy)

### 2. Three Types of Modals Found

1. **Generic Entity Modals** (using EntityForm)
   - inventory-form.tsx (already exists)
   - Uses FormConfig system
   - Handles all CRUD operations

2. **Specialized Modals** (custom implementation)
   - assign-staff-modal.tsx (best reference)
   - Custom logic and state management
   - Example of complex modal pattern

3. **Simple Modals** (specific functionality)
   - create-task-modal.tsx
   - close-opportunity-modal.tsx
   - send-email-modal.tsx, send-sms-modal.tsx

### 3. Complete Form Configuration Infrastructure

**Files:**
- `/home/user/boothhq/src/components/forms/types.ts` - Type definitions
- `/home/user/boothhq/src/components/forms/configs/index.ts` - Central registry
- `/home/user/boothhq/src/components/forms/configs/inventoryFormConfig.ts` - Example config
- `/home/user/boothhq/src/components/forms/BaseForm.tsx` - Implementation
- `/home/user/boothhq/src/components/forms/EntityForm.tsx` - Wrapper component

**Features:**
- Declarative field definitions
- Built-in validation
- Grid-based layout system
- Support for related data (dropdowns)
- Conditional field rendering
- Sections/grouping of fields

### 4. State Management Pattern

**Two-Level Approach:**

1. **Data Hooks** (React Query)
   - useInventoryData() - fetch data
   - useAddInventory() - create mutation
   - useUpdateInventory() - update mutation
   - useDeleteInventory() - delete mutation

2. **Feature Hooks** (State + Data)
   - useInventory() - combines modal state + data operations
   - useEventStaff() - staff management example
   - useEventModals() - centralized modal state

### 5. API Route Pattern

All API routes follow the same pattern:

```
GET /api/[entity] - Fetch list with filters
POST /api/[entity] - Create with tenant context
PUT /api/[entity]/[id] - Update with tenant isolation
DELETE /api/[entity]/[id] - Delete with tenant isolation
```

**Key Points:**
- getTenantContext() extracts tenant from session
- Always filter by dataSourceTenantId
- Auto-inject tenant_id in mutations
- Include related data in select
- Meaningful error messages

### 6. Database Schema Pattern

**Equipment Table** (`equipment_items`):
- tenant_id (multi-tenancy)
- item_id (user-friendly ID like C107)
- equipment_type, model, name
- status (available, assigned_to_booth, deployed, maintenance, retired)
- condition (excellent, good, fair, needs_repair)
- assignment fields (booth_id, assigned_to_user_id, assigned_to_event_id)
- metadata (JSONB for flexibility)
- created_at, updated_at, created_by timestamps
- Unique constraint scoped to tenant
- RLS policies for isolation

### 7. Multi-Tenancy Implementation

**Five Key Points:**

1. **API Routes** - Always filter by tenant_id
2. **Database RLS** - Enforced at database level
3. **Form Submission** - Auto-inject tenant_id
4. **Unique Constraints** - Scoped to tenant
5. **Queries** - Include tenant filter

---

## File Locations Summary

### Core Pattern Files
```
/home/user/boothhq/src/components/ui/modal.tsx
/home/user/boothhq/src/components/forms/types.ts
/home/user/boothhq/src/components/forms/BaseForm.tsx
/home/user/boothhq/src/components/forms/EntityForm.tsx
/home/user/boothhq/src/components/forms/configs/index.ts
```

### Form Configurations
```
/home/user/boothhq/src/components/forms/configs/inventoryFormConfig.ts
/home/user/boothhq/src/components/forms/configs/eventFormConfig.ts
/home/user/boothhq/src/components/forms/configs/opportunityFormConfig.ts
```

### State Management Hooks
```
/home/user/boothhq/src/hooks/useEventModals.ts (modal state pattern)
/home/user/boothhq/src/hooks/useEventStaff.ts (feature hook example)
/home/user/boothhq/src/hooks/useEventStaffData.ts (React Query hooks)
```

### Modal Components
```
/home/user/boothhq/src/components/events/assign-staff-modal.tsx (BEST REFERENCE)
/home/user/boothhq/src/components/create-task-modal.tsx
/home/user/boothhq/src/components/close-opportunity-modal.tsx
/home/user/boothhq/src/components/send-email-modal.tsx
/home/user/boothhq/src/components/send-sms-modal.tsx
/home/user/boothhq/src/components/inventory-form.tsx
```

### API Routes
```
/home/user/boothhq/src/app/api/event-staff/route.ts (BEST REFERENCE - complete CRUD)
/home/user/boothhq/src/app/api/event-staff/[id]/route.ts
```

### Database Migrations
```
/home/user/boothhq/supabase/migrations/20250210000001_create_equipment_items.sql
/home/user/boothhq/supabase/migrations/20250208000000_create_event_staff_assignments.sql
```

### Usage Examples
```
/home/user/boothhq/src/app/[tenant]/events/[id]/page.tsx
/home/user/boothhq/src/components/events/event-staff-list.tsx
```

---

## Documentation Created

Three comprehensive guides have been created and saved to the project:

### 1. MODAL_PATTERN_GUIDE.md
Complete guide covering:
- Modal component structure
- Modal configuration patterns
- Form configuration system
- Generic form components
- State management hooks
- React Query data hooks
- API routes pattern
- Database schema patterns
- Complete usage example
- Multi-tenancy implementation
- Architecture summary

**Location**: `/home/user/boothhq/MODAL_PATTERN_GUIDE.md` (27 KB)

### 2. QUICK_REFERENCE_GUIDE.md
Quick reference with:
- All core pattern file paths
- Form configuration files
- State management hooks
- Modal components
- API routes
- Database migrations
- Implementation checklist
- Key architecture insights
- Testing checklist
- Common patterns to remember

**Location**: `/home/user/boothhq/QUICK_REFERENCE_GUIDE.md` (8.2 KB)

### 3. INVENTORY_IMPLEMENTATION_GUIDE.md
Step-by-step implementation guide for inventory system:
- Existing form config review
- Data management hooks (full code)
- API routes (full code)
- Display component (full code)
- Inventory page (full code)
- Implementation checklist
- Key points summary

**Location**: `/home/user/boothhq/INVENTORY_IMPLEMENTATION_GUIDE.md`

---

## Key Patterns to Remember

### 1. Form Configuration Pattern
```typescript
// Define form declaratively
export const inventoryFormConfig: FormConfig<any> = {
  entity: 'inventory',
  fields: [
    { name: 'item_id', type: 'text', label: 'Item ID', required: true },
    { name: 'equipment_type', type: 'select', label: 'Type', options: [...] }
    // ...
  ],
  defaultValues: { status: 'available' }
}

// Use with EntityForm - no custom implementation needed!
<EntityForm
  entity="inventory"
  isOpen={isOpen}
  onClose={onClose}
  onSubmit={handleSubmit}
/>
```

### 2. React Query Pattern
```typescript
// Query hook for fetching
export function useInventoryData() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    staleTime: 30 * 1000,
  })
}

// Mutation hook for creating
export function useAddInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => { /* POST /api/inventory */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })
}
```

### 3. API Route Pattern
```typescript
// Always extract tenant context
const context = await getTenantContext()
const { supabase, dataSourceTenantId } = context

// Always filter by tenant
.eq('tenant_id', dataSourceTenantId)

// Always auto-inject tenant in mutations
const data = { ...body, tenant_id: dataSourceTenantId }
```

### 4. Modal State Pattern
```typescript
// Hook manages both modal state and data
const {
  items,           // Data from React Query
  isModalOpen,     // Modal visibility
  editingItemId,   // Which item being edited
  selectedItem,    // Current item data
  saveItem,        // CRUD operation
  deleteItem,      // Delete operation
  openCreateModal, // Open for create
  openEditModal    // Open for edit
} = useInventory()

// Pass to components
<InventoryForm
  equipment={selectedItem}
  isOpen={isModalOpen}
  onClose={closeModal}
  onSubmit={saveItem}
/>
```

---

## What Already Exists

The following are already implemented:

1. **inventoryFormConfig.ts** - Form configuration with all fields
2. **inventory-form.tsx** - Form wrapper component
3. **equipment_items table** - Complete database schema with RLS
4. **Form system infrastructure** - EntityForm, BaseForm, type definitions

## What Needs to Be Implemented for Inventory System

1. **useInventoryData.ts** - React Query hooks (provided in guide)
2. **useInventory.ts** - Feature hook combining state + operations (provided in guide)
3. **/api/inventory/route.ts** - GET and POST endpoints (provided in guide)
4. **/api/inventory/[id]/route.ts** - PUT and DELETE endpoints (provided in guide)
5. **inventory-list.tsx** - Display component with filtering (provided in guide)
6. **/app/[tenant]/inventory/page.tsx** - Main page (provided in guide)

---

## Implementation Steps

1. Create hooks:
   - useInventoryData.ts (copy from INVENTORY_IMPLEMENTATION_GUIDE.md)
   - useInventory.ts (copy from INVENTORY_IMPLEMENTATION_GUIDE.md)

2. Create API routes:
   - /api/inventory/route.ts (copy from guide)
   - /api/inventory/[id]/route.ts (copy from guide)

3. Create components:
   - inventory-list.tsx (copy from guide)
   - page.tsx (copy from guide)

4. Register hook if needed in index files

5. Test CRUD operations

---

## Testing the Pattern

All pattern examples have been extracted from working code in:
- Event staff management system (/components/events/assign-staff-modal.tsx)
- Event staff API routes (/app/api/event-staff/*)
- Event staff hooks (useEventStaff.ts, useEventStaffData.ts)

These are proven patterns that work in production.

---

## References for Learning

1. **Best Modal Example**: assign-staff-modal.tsx
   - Shows specialized modal pattern
   - Has conditional rendering
   - Demonstrates complex state management

2. **Best API Example**: /app/api/event-staff/route.ts and [id]/route.ts
   - Complete CRUD implementation
   - Tenant isolation
   - Error handling

3. **Best Form Example**: inventoryFormConfig.ts
   - All field types used
   - Validation examples
   - Status and condition enums

4. **Best Hook Example**: useEventStaff.ts
   - Combines state + data management
   - React Query integration
   - CRUD operations

---

## Next Steps

1. Read the three guides created
2. Review the reference files mentioned
3. Copy code from INVENTORY_IMPLEMENTATION_GUIDE.md
4. Follow the implementation checklist
5. Test each CRUD operation
6. Verify multi-tenancy isolation
7. Add any additional features as needed

All code examples are ready to use and follow the established patterns!
