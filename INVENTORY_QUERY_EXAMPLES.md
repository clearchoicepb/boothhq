# Inventory Module - Query Examples

## Quick Reference for Common Inventory Queries

### 1. Get All Available Inventory (Warehouse + Unassigned)

#### Server-Side (Recommended for accuracy)
```typescript
// Check availability for specific date range
const { available } = await fetch(
  '/api/inventory-items/availability?' +
  'start_date=2025-11-14&end_date=2025-11-16'
).then(r => r.json())

// available array contains all items not reserved for that period
```

#### Client-Side (Quick filter)
```typescript
// From inventory list, get available items
const availableItems = items.filter(item => 
  !item.assigned_to_id || // Unassigned
  item.assignment_type === 'warehouse' // In warehouse storage
)
```

---

### 2. Get Inventory Assigned to Specific Staff Member

```typescript
const staffId = '550e8400-e29b-41d4-a716-446655440000'

const staffItems = await fetch(
  `/api/inventory-items?assigned_to_type=user&assigned_to_id=${staffId}`
).then(r => r.json())

// Returns all items currently assigned to this staff member
// Check item.assignment_type to determine if available:
// - 'long_term_staff' → NEVER available (personal equipment)
// - 'event_checkout' → Unavailable until expected_return_date
// - null/undefined → Available to reassign
```

---

### 3. Get Items in Specific Warehouse Location

```typescript
const warehouseId = '550e8400-e29b-41d4-a716-446655440000'

const warehouseItems = await fetch(
  `/api/inventory-items?assigned_to_type=physical_address&assigned_to_id=${warehouseId}`
).then(r => r.json())

// Returns all items stored at this location
// These are available for checkout
```

---

### 4. Get Items in Product Group (Equipment Kit)

```typescript
const kitId = '550e8400-e29b-41d4-a716-446655440000'

const kitItems = await fetch(
  `/api/inventory-items?assigned_to_type=product_group&assigned_to_id=${kitId}`
).then(r => r.json())

// Returns all items in this equipment bundle
// Their availability depends on the kit's assignment_type
```

---

### 5. Check Availability for Event Planning

```typescript
async function getAvailableItemsForEvent(eventStartDate, eventEndDate) {
  // Get availability for the event dates
  const response = await fetch(
    '/api/inventory-items/availability?' +
    `start_date=${eventStartDate}&end_date=${eventEndDate}`
  )
  
  const { available, unavailable, summary } = await response.json()
  
  return {
    available,
    unavailable,
    summary: {
      totalItems: summary.total,
      availableCount: summary.available,
      unavailableCount: summary.unavailable
    }
  }
}

// Usage:
const result = await getAvailableItemsForEvent('2025-11-14', '2025-11-16')
console.log(`Can use: ${result.availableCount} items out of ${result.totalItems}`)
```

---

### 6. Get Items by Category

```typescript
// Get all cameras
const cameras = await fetch(
  '/api/inventory-items?category=Camera'
).then(r => r.json())

// Available categories:
// Camera, Printer, iPad, Computer, Flash/Strobe, Lighting, Backdrop,
// Backdrop Stand, Misc. Fabric, Photo Kiosk, Printer Station, Tripod,
// Custom Experience, Misc.
```

---

### 7. Get Items by Tracking Type

```typescript
// Get all serialized items (individual equipment)
const serialized = await fetch(
  '/api/inventory-items?tracking_type=serial_number'
).then(r => r.json())

// Get all bulk items (quantities)
const bulk = await fetch(
  '/api/inventory-items?tracking_type=total_quantity'
).then(r => r.json())
```

---

### 8. Get Assignment History for Item

```typescript
const itemId = '550e8400-e29b-41d4-a716-446655440000'

const { item, history } = await fetch(
  `/api/inventory-items/${itemId}/history`
).then(r => r.json())

// history is chronologically ordered (newest first)
// Each entry shows:
// - from: { type, id, name } - previous location
// - to: { type, id, name } - new location
// - assignmentType: 'warehouse' | 'long_term_staff' | 'event_checkout'
// - event: { id, name } - if tied to event
// - expectedReturnDate: ISO date string
// - changedBy: { id, name } - user who made change
// - changedAt: ISO timestamp
// - reason: string - optional change reason
```

---

### 9. Get Weekend Prep Dashboard

```typescript
const response = await fetch('/api/inventory-items/weekend-prep')
const data = await response.json()

// Returns:
// - weekend_start: ISO timestamp
// - weekend_end: ISO timestamp
// - events: [ { ...event, inventory_count, needs_prep, inventory: [...] } ]
// - total_events: number
// - total_equipment_out: number
// - returns: {
//     total: number,
//     returned: number,
//     expected_today: number,
//     overdue: number,
//     items: [ ... ]
//   }
```

---

### 10. Get Inventory for Specific Event

```typescript
const eventId = '550e8400-e29b-41d4-a716-446655440000'

const { event, inventory, by_staff, ready_count, needs_prep_count } = 
  await fetch(`/api/events/${eventId}/inventory`).then(r => r.json())

// Returns:
// - event: { id, title, start_date }
// - inventory: [ all items assigned to this event ]
// - total_items: number
// - by_staff: [ { staff_id, staff_name, items: [...] } ]
// - ready_count: items with assignment_type='event_checkout' assigned to staff
// - needs_prep_count: items still in warehouse or not assigned to staff
```

---

## Frontend Usage with React Query

### Using the Inventory Hook

```typescript
import { useInventoryItemsData } from '@/hooks/useInventoryItemsData'

export function MyComponent() {
  // Get all items
  const { data: items, isLoading } = useInventoryItemsData()
  
  // Get items for specific staff
  const { data: staffItems } = useInventoryItemsData({
    assigned_to_type: 'user',
    assigned_to_id: staffId
  })
  
  // Get items by category
  const { data: cameras } = useInventoryItemsData({
    category: 'Camera'
  })
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h2>Total Items: {items?.length}</h2>
      <ul>
        {items?.map(item => (
          <li key={item.id}>
            {item.item_name} - {item.assigned_to_name || 'Unassigned'}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Filtering Patterns

### Client-Side Filter: Items Available Right Now

```typescript
const rightNowAvailable = items.filter(item => 
  !item.assigned_to_id ||  // No assignment
  item.assignment_type === 'warehouse'  // In warehouse storage
)
```

### Client-Side Filter: Items Checked Out to Staff

```typescript
const checkedOut = items.filter(item => 
  item.assigned_to_type === 'user' && 
  item.assignment_type === 'event_checkout'
)
```

### Client-Side Filter: Long-term Staff Items

```typescript
const longTermAssigned = items.filter(item => 
  item.assignment_type === 'long_term_staff'
)
```

### Client-Side Filter: Items Due Back This Week

```typescript
import { endOfWeek } from 'date-fns'

const dueThisWeek = items.filter(item => {
  if (!item.expected_return_date) return false
  
  const returnDate = new Date(item.expected_return_date)
  const today = new Date()
  const weekEnd = endOfWeek(today)
  
  return returnDate >= today && returnDate <= weekEnd
})
```

---

## Common Scenarios

### Scenario 1: Staff Member Checks Out Equipment for Event

```typescript
// Get available items for the event dates
const eventStart = '2025-11-14'
const eventEnd = '2025-11-16'

const { available } = await fetch(
  `/api/inventory-items/availability?start_date=${eventStart}&end_date=${eventEnd}`
).then(r => r.json())

// Show available items to staff
// When staff selects items, update with:
const updates = {
  assigned_to_type: 'user',
  assigned_to_id: staffId,
  assignment_type: 'event_checkout',
  event_id: eventId,
  expected_return_date: eventEnd
}

await fetch(`/api/inventory-items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
})
```

### Scenario 2: Staff Returns Equipment After Event

```typescript
// Mark items as returned to warehouse
const warehouseLocationId = '550e8400-e29b-41d4-a716-446655440000'

const update = {
  assigned_to_type: 'physical_address',
  assigned_to_id: warehouseLocationId,
  assignment_type: 'warehouse',
  event_id: null,
  expected_return_date: null
}

await fetch(`/api/inventory-items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(update)
})
```

### Scenario 3: Assign Personal Equipment to Staff Member

```typescript
// Long-term assignment (personal equipment)
const update = {
  assigned_to_type: 'user',
  assigned_to_id: staffId,
  assignment_type: 'long_term_staff'
  // No event_id, no expected_return_date
}

await fetch(`/api/inventory-items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(update)
})
```

---

## Status Determination

### How to Determine if Item is Available

```typescript
function isItemAvailable(item) {
  // Long-term staff items are NEVER available
  if (item.assignment_type === 'long_term_staff') {
    return false
  }
  
  // Items checked out must have passed their return date
  if (item.assignment_type === 'event_checkout') {
    if (item.expected_return_date) {
      const returnDate = new Date(item.expected_return_date)
      const today = new Date()
      return returnDate < today  // Available only AFTER return date
    }
  }
  
  // Unassigned or warehouse stored items are available
  if (!item.assigned_to_id || item.assignment_type === 'warehouse') {
    return true
  }
  
  return false
}
```

### How to Display Item Status

```typescript
function getItemStatus(item) {
  if (!item.assigned_to_id) {
    return 'Unassigned'
  }
  
  switch (item.assignment_type) {
    case 'warehouse':
      return `Warehouse: ${item.assigned_to_name}`
    case 'long_term_staff':
      return `Long-term: ${item.assigned_to_name}`
    case 'event_checkout':
      const returnDate = new Date(item.expected_return_date)
      return `Event Checkout - Returns ${returnDate.toLocaleDateString()}`
    default:
      return item.assigned_to_name || 'Unassigned'
  }
}
```

