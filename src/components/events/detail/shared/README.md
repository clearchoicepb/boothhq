# Event Detail Shared Components

This directory contains reusable components for the Event Detail page following Phase 2 improvements from the UX audit.

## Components

### StickyEventContext
**Purpose:** Displays key event information persistently across all tabs

**Features:**
- Sticky positioning at top of page
- Shows: Event Title, Client, Contact, Event Date, Status
- Responsive design with gradient background
- Always visible to maintain context

**Usage:**
```tsx
<StickyEventContext event={event} />
```

---

### FloatingQuickActions
**Purpose:** Provides quick access to common event actions from any tab

**Features:**
- Floating Action Button (FAB) in bottom-right corner
- Expandable menu with quick actions:
  - Duplicate Event
  - Create Invoice
  - Generate Contract
- Permission-based visibility
- Smooth animations and backdrop overlay

**Usage:**
```tsx
<FloatingQuickActions
  eventId={event.id}
  accountId={event.account_id}
  contactId={event.contact_id}
  tenantSubdomain={tenantSubdomain}
  canCreate={canManageEvents}
/>
```

---

### InlineEditField
**Purpose:** Provides consistent inline editing for text inputs

**Pattern:**
1. Display mode: Shows value with edit icon (on hover)
2. Edit mode: Shows input with green checkmark (save) + red X (cancel)
3. Loading mode: Shows spinner during save
4. Never auto-saves - always requires explicit save action

**Features:**
- Keyboard shortcuts: Enter to save, Escape to cancel
- Loading state during async operations
- Hover-to-reveal edit button
- Customizable input types (text, email, tel, url, number)

**Usage:**
```tsx
<InlineEditField
  label="Event Title"
  value={event.title}
  isEditing={isEditing}
  isLoading={isLoading}
  canEdit={canManageEvents}
  onStartEdit={() => setIsEditing(true)}
  onSave={async (value) => {
    await updateEvent({ title: value })
    setIsEditing(false)
  }}
  onCancel={() => setIsEditing(false)}
/>
```

**Props:**
- `label` (string): Field label
- `value` (string | null): Current value
- `displayValue` (string, optional): Custom formatted display
- `placeholder` (string, default: "Not set"): Empty state text
- `type` ('text' | 'email' | 'tel' | 'url' | 'number', default: 'text')
- `isEditing` (boolean): Whether in edit mode
- `isLoading` (boolean, optional): Shows loading spinner
- `canEdit` (boolean): Show edit button
- `onStartEdit` (function): Called when edit starts
- `onSave` (async function): Called when user saves (receives new value)
- `onCancel` (function): Called when user cancels

---

### InlineEditTextArea
**Purpose:** Provides consistent inline editing for multi-line text (descriptions, notes)

**Pattern:** Same as InlineEditField but with textarea

**Features:**
- Multi-line text editing
- Keyboard shortcuts: Ctrl/Cmd+Enter to save, Escape to cancel
- Character count display (if maxLength provided)
- Resizable textarea
- Larger save/cancel buttons with labels

**Usage:**
```tsx
<InlineEditTextArea
  label="Description"
  value={event.description}
  rows={4}
  maxLength={1000}
  isEditing={isEditingDescription}
  isLoading={isSavingDescription}
  canEdit={canManageEvents}
  onStartEdit={() => setIsEditingDescription(true)}
  onSave={async (value) => {
    await updateEvent({ description: value })
    setIsEditingDescription(false)
  }}
  onCancel={() => setIsEditingDescription(false)}
/>
```

**Props:**
- Same as InlineEditField, plus:
- `rows` (number, default: 4): Textarea height
- `maxLength` (number, optional): Character limit with counter

---

### InlineEditSelect
**Purpose:** Provides consistent inline editing for dropdown/select fields

**Pattern:** Same as InlineEditField but with select dropdown

**Features:**
- Dropdown selection with styled chevron icon
- Keyboard shortcuts: Enter to save, Escape to cancel
- Custom display rendering support (e.g., badges)
- Option grouping support

**Usage:**
```tsx
<InlineEditSelect
  label="Payment Status"
  value={event.payment_status}
  options={[
    { value: 'unpaid', label: 'Unpaid', color: '#red' },
    { value: 'deposit_paid', label: 'Deposit Paid', color: '#yellow' },
    { value: 'paid_in_full', label: 'Paid in Full', color: '#green' }
  ]}
  isEditing={isEditingPayment}
  isLoading={isSavingPayment}
  canEdit={canManageEvents}
  onStartEdit={() => setIsEditingPayment(true)}
  onSave={async (value) => {
    await updateEvent({ payment_status: value })
    setIsEditingPayment(false)
  }}
  onCancel={() => setIsEditingPayment(false)}
  renderDisplay={(option) => (
    option ? <PaymentStatusBadge status={option.value} color={option.color} /> : 'Not set'
  )}
/>
```

**Props:**
- `label` (string): Field label
- `value` (string | null): Current selected value
- `options` (SelectOption[]): Array of options
  - Each option: `{ value: string, label: string, color?: string }`
- `placeholder` (string, default: "Not set"): Empty state text
- `isEditing` (boolean): Whether in edit mode
- `isLoading` (boolean, optional): Shows loading spinner
- `canEdit` (boolean): Show edit button
- `onStartEdit` (function): Called when edit starts
- `onSave` (async function): Called when user saves (receives new value)
- `onCancel` (function): Called when user cancels
- `renderDisplay` (function, optional): Custom renderer for display mode

---

## Design Principles

### Consistency
All inline edit components follow the same interaction pattern:
1. **Display Mode**: Value shown with hover edit button
2. **Edit Mode**: Input/select with green save + red cancel buttons
3. **Loading Mode**: Spinner shown during async operations
4. **No Auto-save**: User must explicitly confirm changes

### Visual Feedback
- **Edit button**: Gray → Blue on hover
- **Save button**: Green background
- **Cancel button**: Red background
- **Loading**: Spinning icon
- **Input focus**: Blue ring outline

### Keyboard Shortcuts
- **Enter**: Save (text/select), Ctrl/Cmd+Enter (textarea)
- **Escape**: Cancel
- **Tab**: Navigate between fields

### Accessibility
- Proper labels and ARIA attributes
- Keyboard navigation support
- Focus management
- Color contrast compliance

---

## Toast Notifications

All components use `react-hot-toast` for user feedback. No `alert()` calls are used.

**Success patterns:**
```tsx
toast.success('Event updated successfully')
toast.success('Staff assigned successfully')
toast.success('Invoice created')
```

**Error patterns:**
```tsx
toast.error('Failed to update event')
toast.error('Please select a user')
toast.error(`Error: ${error.message}`)
```

---

## Migration Guide

### Before (Old Pattern)
```tsx
{isEditing ? (
  <input
    value={editValue}
    onChange={(e) => setEditValue(e.target.value)}
  />
  <button onClick={handleSave}>Save</button>
  <button onClick={handleCancel}>Cancel</button>
) : (
  <p onClick={() => setIsEditing(true)}>{value}</p>
)}
```

### After (New Pattern)
```tsx
<InlineEditField
  label="Field Name"
  value={value}
  isEditing={isEditing}
  canEdit={canEdit}
  onStartEdit={() => setIsEditing(true)}
  onSave={async (newValue) => {
    await saveToAPI(newValue)
    setIsEditing(false)
  }}
  onCancel={() => setIsEditing(false)}
/>
```

**Benefits:**
- ✅ Consistent UI across all fields
- ✅ Built-in loading states
- ✅ Keyboard shortcuts included
- ✅ Less boilerplate code
- ✅ Better accessibility
- ✅ Standardized styling

---

## Examples in Production

See `src/app/[tenant]/events/[id]/page.tsx` for real-world usage examples.

**Key improvements from Phase 2.2:**
- All `alert()` calls replaced with `toast` notifications
- Loading states added to all async operations
- Consistent editing patterns across 15+ fields
- Success/error feedback for every action
