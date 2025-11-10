# Quick Reference Guide - Key File Paths

## CORE PATTERN FILES

### 1. Base Modal Component
/home/user/boothhq/src/components/ui/modal.tsx
- Simple, reusable modal wrapper
- Handles ESC key, backdrop overlay, body overflow

### 2. Form Configuration System
/home/user/boothhq/src/components/forms/types.ts
- FormConfig, FieldConfig, SelectOption interfaces
- ValidationRule, ConditionalRule types

/home/user/boothhq/src/components/forms/configs/index.ts
- Central registry for all entity configurations
- getFormConfig() function for looking up configs

/home/user/boothhq/src/components/forms/EntityForm.tsx
- Generic form component that wraps BaseForm
- Takes entity type and looks up config automatically

/home/user/boothhq/src/components/forms/BaseForm.tsx
- Actual form implementation
- Field rendering, validation, state management
- Supports related data fetching for dropdowns

### 3. Example Form Configs
/home/user/boothhq/src/components/forms/configs/inventoryFormConfig.ts
- Equipment/inventory form definition
- Shows all field types: text, select, date, number, textarea

/home/user/boothhq/src/components/forms/configs/eventFormConfig.ts
- Event form with related data (accounts, contacts)

/home/user/boothhq/src/components/forms/configs/opportunityFormConfig.ts
- Opportunity form example

## STATE MANAGEMENT & HOOKS

### 1. Modal State Hooks
/home/user/boothhq/src/hooks/useEventModals.ts
- Centralized modal state management
- Open/close handlers for all modals
- closeAllModals() utility function

### 2. Data Management Hooks
/home/user/boothhq/src/hooks/useEventStaff.ts
- Staff assignment state and operations
- Integrates with React Query mutations
- Form state for add/edit staff modal

/home/user/boothhq/src/hooks/useEventStaffData.ts
- React Query hooks for CRUD operations
- useEventStaffData() - fetch data
- useAddEventStaff() - create mutation
- useUpdateEventStaff() - update mutation
- useRemoveEventStaff() - delete mutation

## MODAL COMPONENTS

### Event Staff Modal (Reference Implementation)
/home/user/boothhq/src/components/events/assign-staff-modal.tsx
- Example of specialized modal pattern
- Conditional rendering based on role type
- Receives all state via props from parent
- Handles complex form interactions (date/time selection)

### Other Modal Examples
/home/user/boothhq/src/components/create-task-modal.tsx
- Task creation modal
- Form validation and submission

/home/user/boothhq/src/components/close-opportunity-modal.tsx
- Opportunity close confirmation
- Dynamic options based on won/lost status

/home/user/boothhq/src/components/send-email-modal.tsx
/home/user/boothhq/src/components/send-sms-modal.tsx
/home/user/boothhq/src/components/log-communication-modal.tsx
- Various communication modals

## API ROUTES

### Event Staff API (Complete CRUD Example)
/home/user/boothhq/src/app/api/event-staff/route.ts
- GET: Fetch with tenant isolation
- POST: Create with auto-injected tenant_id

/home/user/boothhq/src/app/api/event-staff/[id]/route.ts
- PUT: Update with tenant filter
- DELETE: Remove with tenant filter

**Key Pattern:**
- getTenantContext() to extract tenant
- Always filter by tenant_id in queries
- Auto-inject tenant_id in mutations

## DATABASE MIGRATIONS

### Equipment/Inventory Table
/home/user/boothhq/supabase/migrations/20250210000001_create_equipment_items.sql
- Complete equipment_items schema
- Indexes, RLS policies
- Multi-tenant constraints

### Event Staff Table
/home/user/boothhq/supabase/migrations/20250208000000_create_event_staff_assignments.sql
- Staff assignment schema
- Supports both event-wide and date-specific assignments
- RLS tenant isolation

## DISPLAY COMPONENTS

### Staff List Display
/home/user/boothhq/src/components/events/event-staff-list.tsx
- Renders staff assignments
- Operations vs Event staff sections
- Edit/delete actions

## USAGE IN PAGES

### Event Detail Page
/home/user/boothhq/src/app/[tenant]/events/[id]/page.tsx
- Shows complete integration example
- Uses useEventStaff hook
- Renders AssignStaffModal
- Handles form submission and data updates

---

# Implementation Checklist for Inventory System

Follow this pattern to implement inventory management:

1. CREATE FORM CONFIG
   [ ] src/components/forms/configs/inventoryFormConfig.ts
   [ ] Already exists! Review and update if needed

2. CREATE FORM WRAPPER (optional if using EntityForm)
   [ ] src/components/inventory-form.tsx
   [ ] Already exists! Wraps EntityForm

3. CREATE INVENTORY MODAL
   [ ] src/components/inventory/create-inventory-modal.tsx
   [ ] Similar to AssignStaffModal structure

4. CREATE DATA HOOK
   [ ] src/hooks/useInventory.ts
   [ ] Similar to useEventStaff pattern

5. CREATE REACT QUERY HOOKS
   [ ] src/hooks/useInventoryData.ts
   [ ] useInventoryData(), useAddInventory(), useUpdateInventory(), useRemoveInventory()

6. CREATE API ROUTES
   [ ] src/app/api/inventory/route.ts (GET, POST)
   [ ] src/app/api/inventory/[id]/route.ts (PUT, DELETE)

7. CREATE DISPLAY COMPONENT
   [ ] src/components/inventory-list.tsx
   [ ] Shows all inventory items

8. CREATE INVENTORY PAGE
   [ ] src/app/[tenant]/inventory/page.tsx
   [ ] Lists items, allows CRUD operations

9. MIGRATE TO DATABASE
   [ ] Already have equipment_items table
   [ ] Ensure RLS and indexes are correct

---

# Key Architecture Insights

## State Management Flow
```
Page Component
  ↓
useInventory Hook
  ├→ useState for form state
  └→ React Query mutations
    ├→ useAddInventory
    ├→ useUpdateInventory
    └→ useRemoveInventory
      ↓
    API Routes (/api/inventory/*)
      ↓
    Supabase (with tenant isolation)
```

## Form Configuration Pattern
```
FormConfig object (declarative)
  ↓
EntityForm component (generic)
  ↓
BaseForm component (implementation)
  ├→ Field validation
  ├→ State management
  ├→ Related data fetching
  └→ onSubmit callback
```

## CRUD Mutation Pattern
```
Component calls mutation
  ↓
mutation.mutateAsync(data)
  ↓
API route receives request
  ├→ Extract tenant context
  ├→ Validate auth
  ├→ Perform Supabase operation
  └→ Return result
  ↓
React Query invalidates cache
  ↓
useQuery refetches data
  ↓
Component re-renders
```

## Multi-Tenancy Points
1. API routes: Always filter by tenant_id
2. Database: RLS policies enforce isolation
3. Form submission: Auto-inject tenant_id
4. Queries: Include tenant_id in WHERE clause

---

# Testing Checklist

For each new CRUD feature:

1. CREATE operation
   [ ] Modal opens
   [ ] Form validates
   [ ] API receives correct tenant_id
   [ ] Data saved to database
   [ ] Cache invalidated and refetched
   [ ] UI updates with new item

2. READ operation
   [ ] Data fetches on page load
   [ ] React Query caches results
   [ ] Stale time works (30s default)

3. UPDATE operation
   [ ] Edit modal shows current values
   [ ] Form validates changes
   [ ] API updates with tenant_id filter
   [ ] Cache invalidated and refetched
   [ ] UI updates with new values

4. DELETE operation
   [ ] Delete button visible
   [ ] Confirmation (optional)
   [ ] API deletes with tenant_id filter
   [ ] Cache invalidated
   [ ] Item removed from UI

5. Multi-tenancy
   [ ] Other tenant's data not visible
   [ ] Operations scoped to current tenant
   [ ] RLS policies enforced
   [ ] No cross-tenant contamination

---

# Common Patterns to Remember

1. **Always use hooks for state**
   - Forms: useState
   - Data: React Query useQuery
   - Mutations: React Query useMutation

2. **Modal patterns**
   - Receive all state via props
   - Pass handlers as props
   - Call onSubmit with data
   - Don't fetch data directly

3. **Form validation**
   - Define in FormConfig.validation
   - BaseForm validates on submit
   - Clear errors on field change

4. **Tenant isolation**
   - API: Filter by dataSourceTenantId
   - DB: Check RLS policies
   - Forms: Don't include tenant_id in input

5. **API response format**
   - Always return array or object
   - Include related data in select
   - Handle errors with meaningful messages

6. **Cache invalidation**
   - After mutation, invalidate query key
   - Query will automatically refetch
   - Don't manually update state

7. **Error handling**
   - Toast notifications for UX feedback
   - Log errors for debugging
   - Return meaningful error messages
