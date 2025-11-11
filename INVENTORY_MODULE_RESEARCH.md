# Inventory Module Research Summary

## 1. Overall Structure and File Locations

### Database Migrations (Core Schema)
```
/home/user/boothhq/supabase/migrations/
├── 20251110000000_create_item_categories.sql          # Predefined equipment categories
├── 20251110000001_create_physical_addresses.sql       # Warehouse/office locations
├── 20251110000002_create_product_groups.sql           # Equipment bundles/kits
├── 20251110000003_create_inventory_items.sql          # Main inventory table
├── 20251110000004_create_product_group_items.sql      # Junction table for groups
├── 20251110000005_create_inventory_triggers.sql       # Cascade assignment logic
├── 20251111000000_create_inventory_assignment_history.sql # Audit trail
├── 20251111000001_update_inventory_item_values.sql    # Data updates
└── 20251111000002_fix_unique_serial_constraint.sql    # Constraint fixes
```

### API Routes
```
/home/user/boothhq/src/app/api/
├── inventory-items/
│   ├── route.ts                           # GET (list with filters), POST (create)
│   ├── [id]/route.ts                      # GET (single), PUT (update), DELETE
│   ├── [id]/history/route.ts              # GET assignment history
│   ├── availability/route.ts              # GET availability checking
│   └── weekend-prep/route.ts              # GET weekend dashboard data
├── events/[id]/inventory/route.ts         # GET inventory for specific event
└── admin/update-inventory-values/route.ts # Bulk value updates
```

### UI Components
```
/home/user/boothhq/src/
├── components/
│   ├── inventory/
│   │   ├── inventory-items-list.tsx       # Main inventory list with CRUD
│   │   ├── assignment-history.tsx         # Timeline view of assignment changes
│   │   ├── event-inventory.tsx            # Event-specific inventory view
│   │   ├── bulk-checkout-modal.tsx        # Bulk checkout operations
│   │   └── status-badge.tsx               # Status indicator component
│   ├── inventory-form.tsx                 # Form wrapper
│   └── forms/configs/
│       ├── inventoryFormConfig.ts         # Old form config (legacy)
│       └── inventoryItemFormConfig.ts     # Current form config
├── hooks/
│   └── useInventoryItemsData.ts           # React Query hooks for data
└── app/[tenant]/inventory/
    ├── page.tsx                           # Main inventory page
    ├── [id]/page.tsx                      # Item detail page
    └── new/page.tsx                       # New item page
```

---

## 2. Data Models

### Core Tables Structure

#### `inventory_items` (Main Table)
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY
  tenant_id UUID NOT NULL
  
  -- Basic Item Information
  item_name VARCHAR(255) NOT NULL
  item_category VARCHAR(100) NOT NULL      -- References item_categories
  model VARCHAR(255)                        -- Optional model identifier
  
  -- Tracking Type (Binary Choice)
  tracking_type VARCHAR(50) NOT NULL       -- 'serial_number' OR 'total_quantity'
  serial_number VARCHAR(255)                -- For unique items (required if tracking_type='serial_number')
  total_quantity INTEGER                    -- For bulk items (required if tracking_type='total_quantity')
  
  -- Purchase Info
  purchase_date DATE NOT NULL
  item_value DECIMAL(10, 2) NOT NULL       -- Purchase/replacement value
  
  -- Polymorphic Assignment (One of three types)
  assigned_to_type VARCHAR(50)              -- 'user', 'physical_address', OR 'product_group'
  assigned_to_id UUID                       -- ID reference (polymorphic)
  
  -- Assignment Context
  assignment_type VARCHAR(50)               -- 'warehouse', 'long_term_staff', OR 'event_checkout'
  event_id UUID                             -- Optional event reference
  expected_return_date DATE                 -- For event checkouts
  
  -- Metadata
  item_notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  created_by UUID
)
```

**Key Constraints:**
- Serial number must be UNIQUE per tenant (when tracking_type='serial_number')
- Serial number REQUIRED if tracking_type='serial_number'
- Total quantity REQUIRED and > 0 if tracking_type='total_quantity'

#### `physical_addresses` (Warehouse Locations)
```sql
CREATE TABLE physical_addresses (
  id UUID PRIMARY KEY
  tenant_id UUID NOT NULL
  
  location_name VARCHAR(255) NOT NULL      -- e.g., "Main Warehouse", "North Office"
  street_address VARCHAR(255) NOT NULL
  city VARCHAR(100) NOT NULL
  state_province VARCHAR(100) NOT NULL
  zip_postal_code VARCHAR(20) NOT NULL
  country VARCHAR(100) DEFAULT 'United States'
  location_notes TEXT
  
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
)
```

#### `product_groups` (Equipment Bundles)
```sql
CREATE TABLE product_groups (
  id UUID PRIMARY KEY
  tenant_id UUID NOT NULL
  
  group_name VARCHAR(255) NOT NULL
  description TEXT
  
  -- MUST be assigned to either user OR physical_address
  assigned_to_type VARCHAR(50) NOT NULL    -- 'user' OR 'physical_address' (REQUIRED)
  assigned_to_id UUID NOT NULL             -- References users or physical_addresses
  
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
)
```

#### `product_group_items` (Junction Table)
```sql
CREATE TABLE product_group_items (
  id UUID PRIMARY KEY
  tenant_id UUID NOT NULL
  product_group_id UUID NOT NULL           -- FK to product_groups
  inventory_item_id UUID NOT NULL          -- FK to inventory_items
  date_added TIMESTAMPTZ DEFAULT NOW()
  
  UNIQUE(tenant_id, product_group_id, inventory_item_id)
)
```

#### `inventory_assignment_history` (Audit Trail)
```sql
CREATE TABLE inventory_assignment_history (
  id UUID PRIMARY KEY
  tenant_id UUID NOT NULL
  inventory_item_id UUID NOT NULL
  
  -- State before change
  assigned_from_type TEXT                  -- 'user', 'physical_address', 'product_group', 'unassigned'
  assigned_from_id UUID
  assigned_from_name TEXT                  -- Denormalized for history preservation
  
  -- State after change
  assigned_to_type TEXT                    -- 'user', 'physical_address', 'product_group', 'unassigned'
  assigned_to_id UUID
  assigned_to_name TEXT                    -- Denormalized for history preservation
  
  -- Context
  assignment_type TEXT                     -- 'long_term_staff', 'event_checkout', 'warehouse'
  event_id UUID
  expected_return_date DATE
  
  -- Metadata
  changed_by UUID                          -- User who made the change
  changed_at TIMESTAMPTZ
  change_reason TEXT
  
  created_at TIMESTAMPTZ
)
```

#### `item_categories` (Predefined - System-wide)
```sql
CREATE TABLE item_categories (
  id UUID PRIMARY KEY
  category_name VARCHAR(100) NOT NULL UNIQUE
  sort_order INTEGER
  created_at TIMESTAMPTZ
)

-- Seeded with:
Camera, Printer, iPad, Computer, Flash/Strobe, Lighting, Backdrop, 
Backdrop Stand, Misc. Fabric, Photo Kiosk, Printer Station, Tripod, 
Custom Experience, Misc.
```

---

## 3. Inventory Assignment System

### Assignment Model (Polymorphic Design)

An inventory item can be assigned to ONE of three types:

```
inventory_items
├── assigned_to_type: 'user'
│   └── assigned_to_id → references users(id)
│       └── Assigned to staff member (long-term or event checkout)
│
├── assigned_to_type: 'physical_address'
│   └── assigned_to_id → references physical_addresses(id)
│       └── Stored in warehouse/location
│
└── assigned_to_type: 'product_group'
    └── assigned_to_id → references product_groups(id)
        └── Part of equipment bundle (inherits group's assignment)
```

### Assignment Types (Context)

Each assignment has an optional `assignment_type` field:

- **`'warehouse'`** - Item stored at physical location
  - Assigned to: physical_address
  - Status: Available for checkout
  - No expected return date

- **`'long_term_staff'`** - Permanent staff equipment
  - Assigned to: user
  - Status: NEVER available (locked to this person)
  - No expected return date
  - Examples: Personal iPad, assigned laptop

- **`'event_checkout'`** - Temporary event equipment
  - Assigned to: user
  - Status: Unavailable until expected_return_date
  - HAS expected_return_date (when to return)
  - Example: Projector for wedding on Saturday, return Sunday

- **`null` (Unassigned)** - Not currently assigned
  - No assigned_to_type or assigned_to_id
  - Status: Available

### Product Group Cascading

Product groups automatically cascade their assignment to all member items:

```sql
-- Trigger: cascade_product_group_assignment()
-- When product_group.assigned_to_type changes:
  UPDATE inventory_items
  SET assigned_to_type = NEW.assigned_to_type,
      assigned_to_id = NEW.assigned_to_id
  WHERE id IN (SELECT inventory_item_id FROM product_group_items WHERE product_group_id = NEW.id)

-- Trigger: auto_assign_item_to_group()
-- When item added to product_group:
  UPDATE inventory_items
  SET assigned_to_type = group.assigned_to_type,
      assigned_to_id = group.assigned_to_id
  WHERE id = NEW.inventory_item_id
```

### Staff Assignment Queries (Frontend Logic)

From `inventory-items-list.tsx`:

```typescript
// Status filter logic for "available"
if (statusFilter === 'available') {
  matchesStatus = !item.assigned_to_id || item.assignment_type === 'warehouse'
}

// Status filter for "checked_out"
if (statusFilter === 'checked_out') {
  matchesStatus = item.assignment_type === 'event_checkout'
}

// Status filter for "long_term"
if (statusFilter === 'long_term') {
  matchesStatus = item.assignment_type === 'long_term_staff'
}
```

---

## 4. API Endpoints for Querying Inventory

### GET /api/inventory-items
**Fetch all inventory items with optional filters**

Query Parameters:
- `category` - Filter by item_category
- `tracking_type` - Filter by 'serial_number' or 'total_quantity'
- `assigned_to_type` - Filter by 'user', 'physical_address', 'product_group'
- `assigned_to_id` - Filter by specific assignment ID

Response includes:
- Full item data
- `assigned_to_name` - Resolved name (enriched from users/physical_addresses/product_groups)
- `last_assigned_to` - Previous owner (from assignment history)
- `last_changed_at` - When last assignment changed

```typescript
// Example: Get items assigned to specific staff member
GET /api/inventory-items?assigned_to_type=user&assigned_to_id={userId}
```

### GET /api/inventory-items/[id]
**Fetch single inventory item**

Returns:
- Full item details
- `assigned_to_name` - Resolved name
- `last_assigned_to` - Previous assignment
- `last_changed_at` - Timestamp of last change

### GET /api/inventory-items/availability
**Check equipment availability for date range**

Query Parameters:
- `start_date` (REQUIRED) - ISO date string
- `end_date` (REQUIRED) - ISO date string
- `category` - Optional category filter
- `item_ids` - Optional comma-separated item IDs

Availability Rules (Applied in order):
```typescript
// Rule 1: Long-term staff assignments are NEVER available
if (item.assignment_type === 'long_term_staff') {
  isAvailable = false
}

// Rule 2: Check event checkout return date conflicts
else if (item.assignment_type === 'event_checkout' && item.expected_return_date) {
  const returnDate = new Date(item.expected_return_date)
  if (returnDate > requestStart) {  // Conflict if returns AFTER request starts
    isAvailable = false
  }
}

// Rule 3: Check if assigned to event during period
else if (item.event_id && item.event_date) {
  const eventDate = new Date(item.event_date)
  if (eventDate >= requestStart && eventDate <= requestEnd) {
    isAvailable = false
  }
}

// Otherwise: Available
```

Response Format:
```json
{
  "available": [ /* items that pass all rules */ ],
  "unavailable": [ /* items that fail availability rules */ ],
  "summary": {
    "total": 42,
    "available": 28,
    "unavailable": 14,
    "start_date": "2025-11-14",
    "end_date": "2025-11-16"
  }
}
```

### GET /api/inventory-items/[id]/history
**Fetch assignment history (audit trail)**

Returns timeline of all assignment changes:
```json
{
  "item": { "id": "...", "name": "..." },
  "history": [
    {
      "id": "...",
      "from": { "type": "user", "id": "...", "name": "John Doe" },
      "to": { "type": "physical_address", "id": "...", "name": "Main Warehouse" },
      "assignmentType": "event_checkout",
      "event": { "id": "...", "name": "Smith Wedding" },
      "expectedReturnDate": "2025-11-17",
      "changedBy": { "id": "...", "name": "Admin User" },
      "changedAt": "2025-11-16T10:30:00Z",
      "reason": "Returned after event"
    }
  ]
}
```

### GET /api/inventory-items/weekend-prep
**Get weekend prep dashboard data**

Returns events happening Friday-Sunday and items due back that week:
- Weekend events with inventory counts
- Items due for return (categorized as returned/overdue/expected-today)
- Readiness status for each event

### GET /api/events/[id]/inventory
**Get all inventory assigned to specific event**

Returns:
- Event details
- All inventory assigned to that event
- Grouped by staff member
- Ready vs. needs-prep counts

---

## 5. Warehouse Location and Item Status Tracking

### Location Types

```typescript
// 1. Physical Address (Warehouse)
{
  assigned_to_type: 'physical_address',
  assigned_to_id: 'location-uuid',
  assigned_to_name: 'Main Warehouse',
  assignment_type: 'warehouse'
}

// 2. Staff Member (In Hand)
{
  assigned_to_type: 'user',
  assigned_to_id: 'staff-uuid',
  assigned_to_name: 'John Smith',
  assignment_type: 'event_checkout' | 'long_term_staff'
}

// 3. Product Group (In Kit)
{
  assigned_to_type: 'product_group',
  assigned_to_id: 'group-uuid',
  assigned_to_name: 'Wedding Photo Booth Kit',
  assignment_type: 'warehouse' | 'long_term_staff' | 'event_checkout'
}

// 4. Unassigned (Loose/Lost)
{
  assigned_to_type: null,
  assigned_to_id: null
}
```

### Status Determination Logic

Based on the data model, status is calculated from:

```typescript
// Available Status
const isAvailable = !item.assigned_to_id || item.assignment_type === 'warehouse'

// Current Location
const location = item.assigned_to_name || 'Unassigned'

// If Assigned to User + Event Checkout:
if (item.expected_return_date) {
  const returnDate = new Date(item.expected_return_date)
  const daysUntilReturn = Math.ceil((returnDate - today) / (1000*60*60*24))
}

// Status Badge Display (from status-badge.tsx):
switch (item.assignment_type) {
  case 'long_term_staff':
    return <Badge variant="destructive">Long-term Staff</Badge>
  case 'event_checkout':
    return <Badge variant="secondary">Event Checkout</Badge>
  case 'warehouse':
    return <Badge variant="outline">Warehouse</Badge>
  default:
    return <Badge variant="outline">Unassigned</Badge>
}
```

---

## 6. Existing Filtering and Availability Logic

### Client-Side Filters (inventory-items-list.tsx)

```typescript
// Search: item name, serial number, or category
const matchesSearch = searchTerm === '' ||
  item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  item.item_category?.toLowerCase().includes(searchTerm.toLowerCase())

// Category filter
const matchesCategory = categoryFilter === 'all' || 
  item.item_category === categoryFilter

// Tracking type filter
const matchesTrackingType = trackingTypeFilter === 'all' || 
  item.tracking_type === trackingTypeFilter

// Status filters:
// - "all" - all items
// - "available" - !assigned_to_id OR assignment_type='warehouse'
// - "checked_out" - assignment_type='event_checkout'
// - "long_term" - assignment_type='long_term_staff'
// - "due_this_week" - expected_return_date between today and end of week
```

### Server-Side Availability Logic (availability/route.ts)

**Three-Rule Availability Checking:**

1. **Long-term assignments never available**
   - If `assignment_type === 'long_term_staff'` → UNAVAILABLE

2. **Event checkout return date check**
   - If `assignment_type === 'event_checkout'` and `expected_return_date > requestStart`
   - If `expected_return_date <= requestEnd` → Mark `available_from` date
   - Status: UNAVAILABLE until return date

3. **Event assignment date check**
   - If `event_id` exists and event date is within requested range
   - Status: UNAVAILABLE during event

---

## 7. Querying "Available" Inventory

### Query Pattern 1: Warehouse Items

```typescript
// Items in warehouse (stored at physical location)
GET /api/inventory-items?assigned_to_type=physical_address

// Returns all items currently stored at locations
// These are presumed available for event checkout
```

### Query Pattern 2: Staff-Assigned Items

```typescript
// Items assigned to specific staff member
GET /api/inventory-items?assigned_to_type=user&assigned_to_id={staffId}

// Returns items currently in hand by this person
// May or may not be available (depends on assignment_type)
```

### Query Pattern 3: Availability Check

```typescript
// Check what's available for a specific date range
GET /api/inventory-items/availability?start_date=2025-11-14&end_date=2025-11-16

// Returns:
// - available: [] - items not conflicting with period
// - unavailable: [] - items with conflicts
// - summary: { total, available, unavailable }
```

### Query Pattern 4: Unassigned/Available

```typescript
// Frontend filter logic for available items
const availableItems = items.filter(item => 
  !item.assigned_to_id || item.assignment_type === 'warehouse'
)

// This catches:
// 1. Completely unassigned items
// 2. Items in warehouse storage (not checked out to staff)
```

### Example: Get All Available Items for Event Checkout

```typescript
// Step 1: Get all items
const allItems = await fetch('/api/inventory-items')

// Step 2: Check availability for specific dates
const { available } = await fetch(
  '/api/inventory-items/availability?' +
  'start_date=2025-11-14&end_date=2025-11-16'
)

// Step 3: Filter to show only warehouse-stored items
const warehouseAvailable = available.filter(item => 
  item.assigned_to_type === 'physical_address' || !item.assigned_to_type
)

// Step 4: Show to user for selection
```

---

## Summary: Available Inventory Definition

**An item is "available" for event checkout if:**

1. It is NOT assigned to a user with `assignment_type='long_term_staff'`
2. It is NOT checked out to a user with an `expected_return_date` in the future
3. It is NOT assigned to an event that conflicts with the requested date range
4. It is either:
   - Stored in a warehouse (`assigned_to_type='physical_address'`), OR
   - Completely unassigned (`assigned_to_id IS NULL`)

**These items can be queried via:**
- Frontend filter: `!item.assigned_to_id || item.assignment_type === 'warehouse'`
- Backend API: `GET /api/inventory-items/availability?start_date=X&end_date=Y`
