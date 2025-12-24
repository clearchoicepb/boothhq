# Setup Time Integration Audit

**Date:** December 24, 2024
**Purpose:** Comprehensive audit of event time references to prepare for Setup Time integration as a first-class field alongside Event Start Time and Event End Time.

---

## Table of Contents

1. [Database Layer](#1-database-layer)
2. [Type Definitions](#2-type-definitions)
3. [Form Components](#3-form-components)
4. [Display Components](#4-display-components)
5. [Business Logic (API Routes)](#5-business-logic-api-routes)
6. [Staffing Integration](#6-staffing-integration)
7. [Gap Analysis](#7-gap-analysis)
8. [Implementation Priority](#8-implementation-priority)

---

## 1. Database Layer

### event_dates Table

- **File:** `supabase/migrations/20250121000000_phase1_database_foundation.sql`
- **Purpose:** Foundation table for storing individual event dates with times
- **Current time fields:** `start_time TIME`, `end_time TIME`
- **Setup time present:** Added later via migration

- **File:** `supabase/migrations/20251112000007_add_setup_time_to_event_dates.sql`
- **Purpose:** Adds setup_time to event_dates table
- **Current time fields:** `setup_time TIME`
- **Setup time present:** Yes
- **Priority:** N/A - Already exists

### events Table

- **File:** `supabase/migrations/20251014020000_add_event_setup_time.sql`
- **Purpose:** Adds event_setup_time field to events table
- **Current time fields:** `event_setup_time TIME`
- **Setup time present:** Yes (named `event_setup_time`)
- **Priority:** N/A - Already exists
- **Note:** Later removed in `20251014030000_add_load_in_notes.sql`

- **File:** `supabase/migrations/20250213000000_add_event_task_fields.sql`
- **Purpose:** Operations task tracking fields
- **Current time fields:** `setup_time_scheduled BOOLEAN`
- **Setup time present:** Boolean flag only (not time value)
- **Priority:** Low

### event_staff_assignments Table

- **File:** `supabase/migrations/20250208000006_update_event_staff_assignments.sql`
- **Purpose:** Staff scheduling with individual times
- **Current time fields:** `start_time TIME`, `end_time TIME`
- **Setup time present:** No (by design - staff have their own schedule)
- **Priority:** N/A - Staff times are independent

### Template Sections (Contracts)

- **File:** `supabase/migrations/20250131220002_seed_system_sections.sql`
- **Purpose:** Template merge field placeholders
- **Current time fields:** `{{setup_time}}`, `{{event_start_time}}`, `{{event_end_time}}`
- **Setup time present:** Yes (as merge field)
- **Priority:** N/A - Already exists

---

## 2. Type Definitions

### Primary Event Types

- **File:** `src/types/database.ts`
- **Purpose:** Auto-generated database schema types
- **Current time fields:** `setup_time`, `start_time`, `end_time` (lines 615-617)
- **Setup time present:** Yes
- **Priority:** N/A - Already exists

### Event Module Types

- **File:** `src/types/events.ts`
- **Purpose:** Consolidated event types for application use
- **Current time fields:** Multiple interfaces

| Interface | start_time | end_time | setup_time | Priority |
|-----------|------------|----------|------------|----------|
| EventDate (line 147-149) | Yes | Yes | Yes | N/A |
| EditableEventDate (line 167-169) | Yes | Yes | Yes | N/A |
| EventStaffAssignment (line 93-94) | Yes | Yes | No | N/A (by design) |
| CalendarEvent (line 259-260) | Yes | Yes | No | Medium |
| StaffAssignmentEventDate (line 305-306) | Yes | Yes | No | N/A (by design) |
| StaffAssignmentWithJoins (line 321-322) | Yes | Yes | No | N/A (by design) |

### Logistics Types

- **File:** `src/types/logistics.ts`
- **Purpose:** Event logistics/schedule data
- **Current time fields:** `setup_time`, `start_time`, `end_time`, `load_in_time` (lines 77-79)
- **Setup time present:** Yes
- **Priority:** N/A - Already exists

---

## 3. Form Components

### Event Date Detail Modal (Edit Mode)

- **File:** `src/components/events/event-date-detail-modal.tsx`
- **Purpose:** Modal for viewing/editing individual event date details
- **Current time fields:** `setup_time`, `start_time`, `end_time` (lines 144-211)
- **Setup time present:** Yes - Full edit support
- **Priority:** N/A - Already complete

### Event Form (Create/Edit Event)

- **File:** `src/components/event-form-enhanced.tsx`
- **Purpose:** Main form for creating/editing events with dates
- **Current time fields:** `start_time`, `end_time` only (lines 78-84, 784-806)
- **Setup time present:** No
- **Priority:** High - Primary event creation form

**Details:**
- `EventDateForm` interface (line 77-84) only has `start_time` and `end_time`
- Date entry section (lines 779-815) only renders start/end time inputs
- No setup_time input field exists in the form

### Opportunity Form

- **File:** `src/components/opportunity-form-enhanced.tsx`
- **Purpose:** Form for creating/editing opportunities with event dates
- **Current time fields:** `start_time`, `end_time` only (lines 325-352)
- **Setup time present:** No
- **Priority:** High - Opportunities flow to events

### Staff Assignment Modal

- **File:** `src/components/events/assign-staff-modal.tsx`
- **Purpose:** Modal for assigning staff to event dates
- **Current time fields:** Staff `startTime`, `endTime`; shows event `setup_time` as info (line 266-269)
- **Setup time present:** Yes (read-only display from event)
- **Priority:** N/A - Correctly shows event setup_time as context

---

## 4. Display Components

### Event Dates Card

- **File:** `src/components/events/event-dates-card.tsx`
- **Purpose:** Displays event dates in tabs with details
- **Current time fields:** `setup_time`, `start_time`, `end_time` (lines 50-66, 124-150)
- **Setup time present:** Yes - Fully displays all three times
- **Priority:** N/A - Already complete

### Logistics Schedule

- **File:** `src/components/events/logistics/LogisticsSchedule.tsx`
- **Purpose:** Displays event schedule for logistics view/PDF
- **Current time fields:** `setupTime`, `loadInTime`, `startTime`, `endTime` (lines 27-31, 56-121)
- **Setup time present:** Yes - Full display support
- **Priority:** N/A - Already complete

### Event Logistics Main Component

- **File:** `src/components/events/logistics/EventLogistics.tsx`
- **Purpose:** Main logistics orchestrator component
- **Current time fields:** Passes all times to LogisticsSchedule (lines 139-145)
- **Setup time present:** Yes
- **Priority:** N/A - Already complete

### Event Staff List

- **File:** `src/components/events/event-staff-list.tsx`
- **Purpose:** Displays staff assignments with times
- **Current time fields:** Staff `start_time`, `end_time` (lines 257-264)
- **Setup time present:** N/A - Staff have independent times
- **Priority:** N/A - By design

### Event Preview Modal

- **File:** `src/components/events/event-preview-modal.tsx`
- **Purpose:** Quick preview modal for events from timeline/calendar
- **Current time fields:** `start_time`, `end_time` only (lines 145-150)
- **Setup time present:** No
- **Priority:** Medium - User-facing quick view

### Calendar View

- **File:** `src/components/calendar-view.tsx`
- **Purpose:** Month/week/day calendar with event display
- **Current time fields:** `start_time`, `end_time` (lines 14-15, 245-249)
- **Setup time present:** No
- **Priority:** Medium - Calendar event display

### Event Timeline View

- **File:** `src/components/events/event-timeline-view.tsx`
- **Purpose:** Kanban-style timeline of upcoming events
- **Current time fields:** Uses Event type (which has times via event_dates)
- **Setup time present:** Indirect (via Event.event_dates)
- **Priority:** Low - Timeline card doesn't show specific times

### Event Timeline Card

- **File:** `src/components/events/event-timeline-card.tsx`
- **Purpose:** Individual event card in timeline view
- **Current time fields:** Would need to check (referenced from timeline-view)
- **Setup time present:** Likely not displayed
- **Priority:** Low - Summary card

---

## 5. Business Logic (API Routes)

### Events List API (GET)

- **File:** `src/app/api/events/route.ts`
- **Purpose:** Fetch all events with dates
- **Current time fields:** `start_time`, `end_time` selected from event_dates (lines 32-34)
- **Setup time present:** No - Not included in select
- **Priority:** High - Affects all event lists

**Fix needed:**
```typescript
event_dates(
  id,
  event_date,
  setup_time,  // ADD THIS
  start_time,
  end_time,
  ...
)
```

### Events Create API (POST)

- **File:** `src/app/api/events/route.ts`
- **Purpose:** Create new event with dates
- **Current time fields:** Inserts `start_time`, `end_time` (lines 291-293)
- **Setup time present:** No - Not included in insert
- **Priority:** High - Affects event creation

**Fix needed:**
```typescript
const eventDatesInsert = event_dates.map((date: any) => ({
  ...
  setup_time: date.setup_time || null,  // ADD THIS
  start_time: date.start_time || null,
  end_time: date.end_time || null,
  ...
}))
```

### Single Event API (GET)

- **File:** `src/app/api/events/[id]/route.ts`
- **Purpose:** Fetch single event details
- **Current time fields:** `start_time`, `end_time` selected (lines 55-57)
- **Setup time present:** No - Not included in select
- **Priority:** High - Affects event detail views

### Single Event API (PUT)

- **File:** `src/app/api/events/[id]/route.ts`
- **Purpose:** Update event and dates
- **Current time fields:** Inserts `start_time`, `end_time` (lines 253-254)
- **Setup time present:** No - Not included in insert
- **Priority:** High - Affects event updates

### Convert Opportunity to Event API

- **File:** `src/app/api/opportunities/[id]/convert-to-event/route.ts`
- **Purpose:** Convert opportunity to event, copying dates
- **Current time fields:** `start_time`, `end_time` copied (lines 281-282)
- **Setup time present:** No - Not copied during conversion
- **Priority:** High - Affects opp-to-event flow

**Fix needed:**
```typescript
const eventDatesData = opportunityEventDates.map((date: any) => ({
  ...
  setup_time: date.setup_time || null,  // ADD THIS
  start_time: date.start_time,
  end_time: date.end_time,
  ...
}))
```

### Event Staff API

- **File:** `src/app/api/event-staff/route.ts`
- **Purpose:** Staff assignment CRUD
- **Current time fields:** Staff `start_time`, `end_time` (line 32-33)
- **Setup time present:** N/A - Staff times are independent
- **Priority:** N/A - By design

### Contracts API

- **File:** `src/app/api/contracts/route.ts`
- **Purpose:** Contract generation with merge fields
- **Current time fields:** Accesses `event.setup_time` for merge (lines 106-108)
- **Setup time present:** Yes - Used in merge fields
- **Priority:** N/A - Already complete

### Event Logistics API

- **File:** `src/app/api/events/[id]/logistics/route.ts`
- **Purpose:** Fetch logistics data including times
- **Current time fields:** Would need to verify
- **Setup time present:** Likely included (logistics types have it)
- **Priority:** Low - Verify only

---

## 6. Staffing Integration

### Current Flow

1. **Event dates** store `setup_time`, `start_time`, `end_time`
2. **Staff assignments** have their own `start_time`, `end_time` (independent)
3. **AssignStaffModal** shows event's `setup_time` as context when selecting dates
4. Staff times can differ from event times (correct design for flexibility)

### Where setup_time flows into staffing:

- **File:** `src/components/events/assign-staff-modal.tsx` (line 266-269)
- **Purpose:** Shows setup_time as read-only info when assigning staff
- **Current behavior:** Displays "Setup starts at: {setup_time}" as helper text
- **Setup time present:** Yes (read-only context)
- **Priority:** N/A - Already working

### Staff time defaults:

- **File:** `src/components/events/assign-staff-modal.tsx` (lines 116-117)
- **Purpose:** Default staff times when date is selected
- **Current behavior:** Defaults to `start_time || '09:00'` and `end_time || '17:00'`
- **Setup time present:** No - Staff defaults don't consider setup_time
- **Priority:** Low - Could optionally default staff start to setup_time

---

## 7. Gap Analysis

### Summary Table

| Layer | setup_time Present? | Action Required |
|-------|---------------------|-----------------|
| **Database** | Yes | None |
| **TypeScript Types** | Mostly Yes | Add to CalendarEvent |
| **Event Date Detail Modal** | Yes | None |
| **Event Form** | **No** | Add input field |
| **Opportunity Form** | **No** | Add input field |
| **Event Dates Card** | Yes | None |
| **Logistics Display** | Yes | None |
| **Event Preview Modal** | **No** | Add display |
| **Calendar View** | **No** | Add display |
| **Events List API (GET)** | **No** | Add to select |
| **Events Create API (POST)** | **No** | Add to insert |
| **Events Detail API (GET)** | **No** | Add to select |
| **Events Update API (PUT)** | **No** | Add to insert |
| **Convert to Event API** | **No** | Add to copy |
| **Staff Integration** | Yes | None (context display works) |

### Critical Gaps (High Priority)

1. **event-form-enhanced.tsx** - Users cannot enter setup_time when creating events
2. **opportunity-form-enhanced.tsx** - Users cannot enter setup_time when creating opportunities
3. **src/app/api/events/route.ts (GET)** - setup_time not fetched
4. **src/app/api/events/route.ts (POST)** - setup_time not saved
5. **src/app/api/events/[id]/route.ts (GET)** - setup_time not fetched
6. **src/app/api/events/[id]/route.ts (PUT)** - setup_time not saved
7. **src/app/api/opportunities/[id]/convert-to-event/route.ts** - setup_time not copied

### Display Gaps (Medium Priority)

8. **event-preview-modal.tsx** - Quick preview doesn't show setup_time
9. **calendar-view.tsx** - Calendar event popover doesn't show setup_time

### Type Gaps (Low Priority)

10. **CalendarEvent interface** in `src/types/events.ts` - Add optional setup_time field

---

## 8. Implementation Priority

### Phase 1: API Layer (Required First)
Files to update:
1. `src/app/api/events/route.ts` - GET & POST
2. `src/app/api/events/[id]/route.ts` - GET & PUT
3. `src/app/api/opportunities/[id]/convert-to-event/route.ts`

### Phase 2: Form Components
Files to update:
1. `src/components/event-form-enhanced.tsx`
2. `src/components/opportunity-form-enhanced.tsx`

### Phase 3: Display Components
Files to update:
1. `src/components/events/event-preview-modal.tsx`
2. `src/components/calendar-view.tsx`

### Phase 4: Type Updates (Optional)
Files to update:
1. `src/types/events.ts` - CalendarEvent interface

---

## Appendix: Relevant Hook Files

These hooks may need review after API changes:

- `src/hooks/useEventData.ts`
- `src/hooks/useEvents.ts`
- `src/hooks/useEventLogistics.ts`
- `src/hooks/useOpportunityForm.ts`
- `src/hooks/useOpportunityFormInitializer.ts`

---

*This audit was generated to prepare for integrating Setup Time as a first-class field throughout the BoothHQ application.*
