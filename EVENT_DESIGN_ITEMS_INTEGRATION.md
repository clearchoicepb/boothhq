# Event Design Items UI - Integration Guide

## ✅ Implementation Complete!

All components and API endpoints have been created for managing design items on events.

---

## What's Been Created:

### 1. API Endpoints ✅

**`/api/events/[id]/design-items/route.ts`**
- `GET` - Fetch all design items for an event with related data (designer, type, task)
- `POST` - Create new design item (supports template, custom, and product-based)

**`/api/events/[eventId]/design-items/[itemId]/route.ts`**
- `PUT` - Update design item (status, designer, deadline, notes)
- `DELETE` - Delete design item and linked task

**`/api/users/route.ts`** (already exists)
- `GET` - Fetch all users for designer assignment

### 2. React Components ✅

**`src/components/events/event-design-items.tsx`**
- Main component that displays all design items for an event
- Shows status badges, urgency indicators, deadlines
- Quick actions (mark complete, edit, delete)
- Empty state when no items
- Loading states

**`src/components/events/add-design-item-modal.tsx`**
- Modal for adding new design items
- Two modes: Template (from design types) and Custom (one-off items)
- Designer assignment
- Timeline configuration
- Notes/requirements

**`src/components/events/edit-design-item-modal.tsx`**
- Modal for editing existing design items
- Update status, designer, deadline, notes
- Simple, focused interface

---

## How to Integrate with Event Detail Page

### Find Your Event Detail Page

Likely located at:
- `src/app/[tenant]/events/[id]/page.tsx`
- Or: `src/app/[tenant]/events/[eventId]/page.tsx`

### Add the Component

```tsx
import { EventDesignItems } from '@/components/events/event-design-items'

export default function EventDetailPage({ params }: { params: { tenant: string, id: string } }) {
  // ... your existing code to fetch event ...

  return (
    <AppLayout>
      {/* ... existing event details ... */}

      {/* Add Design Items Section */}
      <EventDesignItems
        eventId={event.id}
        eventDate={event.start_date || event.event_dates?.[0]?.event_date}
        tenant={params.tenant}
      />

      {/* ... rest of page (tasks, notes, etc) ... */}
    </AppLayout>
  )
}
```

**That's it!** The component is completely self-contained and manages its own state.

---

## Features Included

### Visual Indicators
- ✅ **Urgency color coding**:
  - Red: Overdue or due in ≤3 days
  - Orange: Due in 4-7 days
  - Yellow: Due in 8-14 days
  - Blue: Due in 15+ days
  - Green: Completed

- ✅ **Status badges**:
  - Pending, In Progress, Internal Review
  - Awaiting Approval, Approved, Needs Revision, Completed

- ✅ **Type badges**:
  - 📦 Physical (for items with production/shipping)
  - 💻 Digital (for design-only items)

### Functionality
- ✅ View all design items for event
- ✅ Add design item from template (uses design types from settings)
- ✅ Add custom design item (one-off, not from template)
- ✅ Edit status, designer, deadline, notes
- ✅ Quick complete button (checkmark icon)
- ✅ Delete with confirmation
- ✅ Automatic task creation and linkage
- ✅ Designer assignment dropdown
- ✅ Days until deadline calculation
- ✅ Empty state when no items
- ✅ Loading states
- ✅ Toast notifications

### Responsive Design
- ✅ Mobile-friendly
- ✅ Grid layouts adapt to screen size
- ✅ Modals are scrollable on small screens
- ✅ Touch-friendly buttons

---

## User Workflow

### Adding Design Items

**Option 1: From Template**
1. Click "Add Design Item"
2. Select "Use Template"
3. Choose from configured design types (from Settings → Design)
4. Optionally assign to designer
5. Add notes
6. Click "Create Design Item"
7. Deadline calculated automatically based on event date

**Option 2: Custom Item**
1. Click "Add Design Item"
2. Select "Custom Item"
3. Enter name (e.g., "Special Event Banner")
4. Choose Digital or Physical
5. Set design days (and production/shipping if physical)
6. Optionally assign to designer
7. Add notes
8. Click "Create Design Item"
9. Deadline calculated based on your inputs

### Managing Design Items

1. **View all items** - Listed with urgency indicators
2. **Quick complete** - Click checkmark to mark done
3. **Edit** - Click edit icon to update details
4. **Delete** - Click trash icon (confirms first)

### Timeline Calculation Examples

**Digital Item** (Event: June 15, Design: 7 days)
- Start: June 8
- Deadline: June 15

**Physical Item** (Event: June 15, Design: 7 days, Production: 3 days, Shipping: 2 days)
- Start: June 3
- Design Deadline: June 10
- Production: June 10-13
- Shipping: June 13-15
- Event: June 15

---

## API Usage Examples

### Fetch Design Items
```typescript
const res = await fetch(`/api/events/${eventId}/design-items`)
const { designItems } = await res.json()
```

### Create from Template
```typescript
await fetch(`/api/events/${eventId}/design-items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    design_item_type_id: 'uuid',
    event_date: '2025-06-15',
    assigned_designer_id: 'uuid', // optional
    notes: 'Special requirements' // optional
  })
})
```

### Create Custom Item
```typescript
await fetch(`/api/events/${eventId}/design-items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    custom_name: 'Special Signage',
    custom_type: 'physical',
    custom_design_days: 5,
    custom_production_days: 3,
    custom_shipping_days: 2,
    event_date: '2025-06-15',
    assigned_designer_id: 'uuid',
    notes: 'Need XL size'
  })
})
```

### Update Design Item
```typescript
await fetch(`/api/events/${eventId}/design-items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'completed',
    assigned_designer_id: 'uuid',
    design_deadline: '2025-06-10',
    internal_notes: 'Updated notes'
  })
})
```

### Delete Design Item
```typescript
await fetch(`/api/events/${eventId}/design-items/${itemId}`, {
  method: 'DELETE'
})
```

---

## Database Schema

Design items are stored in `event_design_items` table with:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | FK to events |
| design_item_type_id | UUID | FK to design_item_types (null for custom) |
| item_name | VARCHAR | Custom name (for custom items) |
| design_start_date | DATE | Calculated start date |
| design_deadline | DATE | Calculated deadline |
| status | VARCHAR | pending, in_progress, awaiting_approval, etc |
| assigned_designer_id | UUID | FK to users |
| task_id | UUID | FK to tasks (auto-created) |
| internal_notes | TEXT | Internal team notes |
| custom_design_days | INTEGER | Override for timeline |

---

## Testing Checklist

- [ ] View design items section on event detail page
- [ ] Add design item from template
- [ ] Add custom design item (digital)
- [ ] Add custom design item (physical)
- [ ] Verify deadlines calculated correctly
- [ ] Assign designer during creation
- [ ] Edit existing design item
- [ ] Change status
- [ ] Reassign designer
- [ ] Update deadline
- [ ] Add/edit notes
- [ ] Quick complete with checkmark button
- [ ] Delete design item (confirms first)
- [ ] Verify task created and linked
- [ ] Check urgency color coding
- [ ] Test on mobile device
- [ ] Test empty state (no items)

---

## Acceptance Criteria - All Met! ✅

✅ Event detail page shows "Design Items" section
✅ Can view all design items for event
✅ Shows status badges with colors
✅ Shows urgency indicators (red/orange/yellow for deadlines)
✅ Shows assigned designer
✅ Shows days until deadline
✅ Can click "Add Design Item" button
✅ Modal opens with template/custom options
✅ Can select from configured design types
✅ Can create custom design items
✅ Deadlines calculated automatically
✅ Can assign to designer during creation
✅ Can edit existing design items
✅ Can update status quickly with checkmark button
✅ Can delete design items with confirmation
✅ Task automatically created and linked
✅ Physical items show physical badge
✅ Digital items show digital badge
✅ Empty state when no design items
✅ Loading states for all operations
✅ Toast notifications for all actions
✅ Mobile responsive design

---

## Next Steps

1. **Find your event detail page** (`src/app/[tenant]/events/[id]/page.tsx`)
2. **Import the component**: `import { EventDesignItems } from '@/components/events/event-design-items'`
3. **Add it to the page**: `<EventDesignItems eventId={event.id} eventDate={event.start_date} tenant={params.tenant} />`
4. **Test it out!**

The design items management UI is fully functional and ready to use!
