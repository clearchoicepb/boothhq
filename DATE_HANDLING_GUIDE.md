# Date Handling Guide

## ⚠️ CRITICAL: Timezone-Free Date Handling

This application uses **date-only** values (YYYY-MM-DD) throughout the system. We do NOT use timezones for dates because:
- Events happen on specific calendar dates regardless of timezone
- Task due dates are calendar dates, not timestamps
- Displaying "Jan 15" should always mean Jan 15, not Jan 14 or Jan 16

## 🚫 NEVER DO THIS

```typescript
// ❌ BAD - Will cause off-by-one day errors in negative UTC timezones
const eventDate = new Date('2025-01-15')
// In EST (UTC-5), this becomes: 2025-01-14 19:00:00 EST
// When displayed: "Jan 14" ❌ WRONG!

// ❌ BAD - Adds timezone information to date-only values
const startDate = new Date(eventDate).toISOString()
// Result: "2025-01-15T00:00:00.000Z" 
// This will shift dates in negative UTC timezones!

// ❌ BAD - Direct date comparison without timezone handling
if (new Date(event.start_date) < new Date()) {
  // This will give wrong results!
}
```

## ✅ ALWAYS DO THIS

```typescript
// ✅ GOOD - Parse dates in local timezone
import { parseLocalDate, formatDate, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'

const eventDate = parseLocalDate('2025-01-15')
// Always: 2025-01-15 in local timezone ✅

// ✅ GOOD - Format dates for display
const displayDate = formatDate('2025-01-15')
// Result: "Jan 15, 2025" ✅

// ✅ GOOD - Check days until event
const daysUntil = getDaysUntil('2025-01-15')
// Correct calculation regardless of timezone ✅

// ✅ GOOD - Check if date is today
if (isDateToday('2025-01-15')) {
  // Correct comparison ✅
}
```

## 📋 Date Utilities Reference

### Import Statement
```typescript
import {
  parseLocalDate,
  formatDate,
  formatDateShort,
  formatDateLong,
  getDaysUntil,
  isDatePast,
  isDateToday,
  toDateInputValue,
  formatTime,
  formatDateTime
} from '@/lib/utils/date-utils'
```

### Core Functions

#### `parseLocalDate(dateString: string): Date`
**Use this instead of `new Date(dateString)` for YYYY-MM-DD strings**

```typescript
const date = parseLocalDate('2025-01-15')
// Returns: Date object in local timezone for Jan 15, 2025
```

#### `formatDate(dateString: string | null, options?, fallback?): string`
**Use this for displaying dates**

```typescript
formatDate('2025-01-15')
// Returns: "Jan 15, 2025"

formatDate('2025-01-15', { month: 'long', day: 'numeric', year: 'numeric' })
// Returns: "January 15, 2025"

formatDate(null, {}, 'Not set')
// Returns: "Not set"
```

#### `getDaysUntil(dateString: string | null): number | null`
**Calculate days between today and a future date**

```typescript
const days = getDaysUntil('2025-01-20')
// If today is Jan 15: Returns 5
// If today is Jan 20: Returns 0
// If today is Jan 25: Returns -5 (past date)
```

#### `isDateToday(dateString: string | null): boolean`
**Check if a date is today**

```typescript
if (isDateToday(event.start_date)) {
  // Event is today!
}
```

#### `isDatePast(dateString: string | null): boolean`
**Check if a date is in the past**

```typescript
if (isDatePast(event.start_date)) {
  // Event has passed
}
```

#### `toDateInputValue(date: Date | string): string`
**Convert Date to YYYY-MM-DD for form inputs**

```typescript
const inputValue = toDateInputValue(new Date())
// Returns: "2025-01-15"

const inputValue2 = toDateInputValue('2025-01-15')
// Returns: "2025-01-15" (unchanged)
```

## ⏰ Time Formatting (12-Hour Format)

#### `formatTime(timeString: string | null): string`
**Format 24-hour time to 12-hour with AM/PM**

```typescript
formatTime('14:30')
// Returns: "2:30 PM"

formatTime('09:15')
// Returns: "9:15 AM"
```

#### `formatDateTime(dateString: string, timeString: string): string`
**Combine date and time for display**

```typescript
formatDateTime('2025-01-15', '14:30')
// Returns: "Jan 15, 2025 - 2:30 PM"
```

## 🔧 API Routes: Storing Dates

### When Creating/Updating Records

```typescript
// ✅ GOOD - Store dates as YYYY-MM-DD strings
const insertData = {
  start_date: '2025-01-15',  // Just the string from the form
  due_date: request.body.due_date || null
}

// ✅ GOOD - If you need to calculate a date
const dueDate = new Date()
dueDate.setDate(dueDate.getDate() + 7)
const dueDateStr = dueDate.toISOString().split('T')[0]  // Extract date part
// Result: "2025-01-22"

// ❌ BAD - Don't use full ISO string for date-only fields
const startDate = new Date().toISOString()
// Result: "2025-01-15T14:30:00.000Z" ❌ Too much info!
```

### When Comparing Dates from Database

```typescript
// ✅ GOOD - Use parseLocalDate for comparisons
import { parseLocalDate } from '@/lib/utils/date-utils'

const eventDate = parseLocalDate(event.start_date)
eventDate.setHours(0, 0, 0, 0)

const today = new Date()
today.setHours(0, 0, 0, 0)

if (eventDate >= today) {
  // Event is upcoming
}
```

## 📝 Forms: Date Inputs

### HTML Date Inputs

```tsx
// ✅ GOOD - HTML date input with YYYY-MM-DD value
<input
  type="date"
  value={formData.event_date}  // Must be YYYY-MM-DD
  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
/>
// Input value is automatically YYYY-MM-DD format ✅
```

### Submitting Dates to API

```typescript
// ✅ GOOD - Send date strings as-is
const response = await fetch('/api/events', {
  method: 'POST',
  body: JSON.stringify({
    start_date: formData.start_date,  // Already YYYY-MM-DD from input
    due_date: formData.due_date || null
  })
})
```

## 🎨 Display Components

### Event Lists/Tables

```tsx
import { formatDate, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'

function EventRow({ event }) {
  const displayDate = formatDate(event.start_date)
  const daysUntil = getDaysUntil(event.start_date)
  
  return (
    <tr>
      <td>{event.title}</td>
      <td>{displayDate}</td>
      <td>
        {isDateToday(event.start_date) 
          ? 'TODAY' 
          : `${daysUntil} days`}
      </td>
    </tr>
  )
}
```

### Date Filtering/Categorization

```typescript
// ✅ GOOD - Filter events by date range
const filteredEvents = events.filter(event => {
  if (!event.start_date) return false
  
  const eventDate = parseLocalDate(event.start_date)
  eventDate.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (dateFilter) {
    case 'today':
      return isDateToday(event.start_date)
    
    case 'upcoming':
      return eventDate >= today
    
    case 'past':
      return eventDate < today
    
    case 'this_week':
      const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      return eventDate >= today && eventDate <= weekEnd
  }
})
```

## 🔍 Common Patterns

### Sorting Events by Date

```typescript
// ✅ GOOD
const sortedEvents = events.sort((a, b) => {
  const aDate = a.start_date ? parseLocalDate(a.start_date) : new Date(a.created_at)
  const bDate = b.start_date ? parseLocalDate(b.start_date) : new Date(b.created_at)
  return aDate.getTime() - bDate.getTime()
})
```

### Calculating Date Ranges

```typescript
// ✅ GOOD - Calculate if event is within next N days
function isWithinDays(dateString: string, days: number): boolean {
  const eventDate = parseLocalDate(dateString)
  eventDate.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + days)
  
  return eventDate >= today && eventDate <= futureDate
}
```

## 🐛 Debugging Date Issues

### Symptoms of Timezone Problems
- Dates display 1 day off (e.g., Jan 15 shows as Jan 14)
- Events appear in wrong categories (e.g., tomorrow's event shows in "Today")
- Task due dates appear incorrect
- Date comparisons give unexpected results

### Quick Fix Checklist
1. ✅ Are you using `parseLocalDate()` instead of `new Date()`?
2. ✅ Are you using `formatDate()` for display?
3. ✅ Are dates stored as YYYY-MM-DD (not ISO timestamps)?
4. ✅ Are you using `.split('T')[0]` when converting ISO to date-only?
5. ✅ Are you setting hours to 0 when comparing dates?

### Testing
```typescript
// Test that dates work correctly in all timezones
const testDate = '2025-01-15'

// This should always be Jan 15
console.log(formatDate(testDate))  // "Jan 15, 2025"

// This should be 0 when testing on Jan 15
console.log(getDaysUntil(testDate))  // 0

// This should be true on Jan 15
console.log(isDateToday(testDate))  // true
```

## 📚 Migration Guide

If you find code using the OLD (incorrect) patterns:

### Before (❌ BAD)
```typescript
const date = new Date(event.start_date)
const formatted = date.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})
```

### After (✅ GOOD)
```typescript
import { formatDate } from '@/lib/utils/date-utils'
const formatted = formatDate(event.start_date)
```

---

## 🔑 Key Principle

**Treat dates as calendar dates, not timestamps. A date string like "2025-01-15" represents January 15th on the calendar, regardless of what timezone you're in. Never add time or timezone information to date-only values.**

