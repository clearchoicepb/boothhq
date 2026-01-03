# Timezone Handling Audit Report

**Date:** January 3, 2026
**Author:** Claude Code
**Status:** FIX IMPLEMENTED

---

## Executive Summary

This audit identified timezone handling issues in the BoothHQ CRM application:

1. **API Time Extraction Bug:** Fallback pattern in logistics API routes converted `TIMESTAMP WITH TIME ZONE` columns to time strings using `new Date().toLocaleTimeString()`, causing timezone shifts.

2. **PDF Date Shifting Bug:** PDF export used `new Date(dateString)` on date-only strings (YYYY-MM-DD), which JavaScript interprets as UTC midnight, causing dates to shift back one day in US timezones.

**FIXES APPLIED:**
- Removed problematic fallback logic from logistics API routes - times now come exclusively from `event_dates` table
- Fixed PDF date formatting to treat date-only strings as local dates by appending `T00:00:00`

---

## 1. Database Schema Analysis

### Time-Related Columns by Table

| Table | Column | Data Type | Notes |
|-------|--------|-----------|-------|
| **events** | `start_date` | `TIMESTAMP WITH TIME ZONE` | Full datetime with TZ - PROBLEMATIC when extracting time |
| **events** | `end_date` | `TIMESTAMP WITH TIME ZONE` | Full datetime with TZ - PROBLEMATIC when extracting time |
| **events** | `load_in_time` | `TIME` (no TZ) | Safe - plain time |
| **events** | `setup_time` | `TIME` (no TZ) | Safe - plain time |
| **event_dates** | `event_date` | `DATE` | Safe - date only |
| **event_dates** | `setup_time` | `TIME` (no TZ) | Safe - plain time |
| **event_dates** | `start_time` | `TIME` (no TZ) | Safe - plain time |
| **event_dates** | `end_time` | `TIME` (no TZ) | Safe - plain time |
| **event_staff_assignments** | `start_time` | `TIME` (no TZ) | Safe - plain time |
| **event_staff_assignments** | `end_time` | `TIME` (no TZ) | Safe - plain time |
| **event_staff_assignments** | `arrival_time` | `TIME` (no TZ) | Safe - plain time |

### Key Insight

The `event_dates` table stores times correctly as PostgreSQL `TIME` type (timezone-unaware). The issue arises when legacy events don't have `event_dates` records and the API falls back to extracting time from `events.start_date` (a `TIMESTAMP WITH TIME ZONE`).

---

## 2. Problem Areas Identified

### CRITICAL - Timezone Conversion Bug

**File:** `src/app/api/events/[id]/logistics/route.ts`
**Lines:** 374-385

```typescript
start_time: targetEventDate?.start_time ||
  (event.start_date ? new Date(event.start_date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : null),
end_time: targetEventDate?.end_time ||
  (event.end_date ? new Date(event.end_date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : null),
```

**Problem:** When `targetEventDate` is null (legacy events without event_dates records), the fallback extracts time from `event.start_date`. This:
1. Parses the UTC timestamp from the database
2. Converts to the **server's** local timezone (NOT the user's or event's timezone)
3. Returns incorrect time

**Example:**
- User enters event at 2:00 PM in Chicago
- Stored as: `2025-01-15T20:00:00Z` (UTC)
- Server in EST: `toLocaleTimeString()` returns `15:00` (3:00 PM)
- User sees wrong time!

---

**File:** `src/app/api/public/logistics/[publicId]/route.ts`
**Lines:** 352-363

Same exact issue in the public logistics endpoint.

---

## 3. Safe Areas (Correct Patterns)

### Time Formatting Utilities

**File:** `src/lib/utils/date-utils.ts` - `formatTime()` (lines 282-299)

```typescript
export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return ''

  try {
    // Handle HH:mm or HH:mm:ss format
    const [hoursStr, minutesStr] = timeString.split(':')
    const hours = parseInt(hoursStr)
    const minutes = minutesStr || '00'

    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12

    return `${hours12}:${minutes} ${ampm}`
  } catch (error) {
    return timeString
  }
}
```

**Status:** CORRECT - Parses TIME strings directly without timezone conversion.

---

### EventLogistics Component

**File:** `src/components/events/logistics/EventLogistics.tsx` - `formatTime()` (lines 14-30)

Has its own local `formatTime()` that correctly handles TIME strings. This component displays time correctly when it receives the correct data from the API.

**Status:** CORRECT

---

### Event Date Detail Modal

**File:** `src/components/events/event-date-detail-modal.tsx`

Uses `formatTime` from `date-utils.ts` and HTML `<input type="time">` elements. Form input and display are handled correctly.

**Status:** CORRECT

---

### Merge Fields

**File:** `src/lib/merge-fields.ts` (lines 152-162)

Time fields are parsed directly from HH:MM:SS format without Date conversion.

**Status:** CORRECT

---

### PDF Generator

**File:** `src/lib/pdf/generators/logistics.ts`

- TIME handling: Uses shared `formatTime()` utility which handles TIME strings correctly.
- DATE handling: **FIXED** - Was using `new Date(dateString)` on date-only strings which caused date shift.

**Fix Applied:**
```typescript
// Before (broken):
const eventDate = new Date(logistics.event_date).toLocaleDateString(...)

// After (fixed):
const dateStr = logistics.event_date.includes('T') ? logistics.event_date : `${logistics.event_date}T00:00:00`
const eventDate = new Date(dateStr).toLocaleDateString(...)
```

**Status:** FIXED

---

### PDF Utilities

**File:** `src/lib/pdf/utils.ts`

The `formatDate()` utility was also updated to handle date-only strings safely.

**Status:** FIXED

---

## 4. Other Patterns to Review (Lower Priority)

### Date Display with toLocaleDateString()

Many files use `new Date(created_at).toLocaleDateString()` for displaying creation/update timestamps. These are generally acceptable because:
- They're displaying approximate timestamps (not event times)
- The timezone shift of a few hours doesn't significantly affect display of "when was this created"

However, for event dates (`event.start_date` used for date display), this could cause off-by-one day errors near midnight. The codebase has `parseLocalDate()` in date-utils.ts for this purpose.

### Files using toLocaleDateString on event dates:
- `src/components/global-search.tsx:120`
- `src/app/forms/[publicId]/page.tsx:142`
- `src/app/staff-form/[publicId]/page.tsx:158`

---

## 5. Root Cause Analysis

The problem is **legacy data migration**. The original schema used:
- `events.start_date` as `TIMESTAMP WITH TIME ZONE` (full datetime)

The new schema uses:
- `event_dates.event_date` as `DATE` (date only)
- `event_dates.start_time` as `TIME` (time only, no TZ)

The fallback logic was added to support events that haven't been migrated to the new `event_dates` structure. But the fallback incorrectly extracts time from the TIMESTAMPTZ column.

---

## 6. Recommended Fix Pattern

### Option A: Remove Fallback (If Legacy Events Can Be Migrated)

```typescript
// Just use event_dates data, no fallback
start_time: targetEventDate?.start_time || null,
end_time: targetEventDate?.end_time || null,
```

Run a migration script to ensure all events have corresponding `event_dates` records.

---

### Option B: Fix the Time Extraction (If Fallback is Needed)

Extract time without timezone conversion by parsing the ISO string directly:

```typescript
function extractTimeFromTimestamp(timestamp: string | null): string | null {
  if (!timestamp) return null

  // Parse ISO timestamp: "2025-01-15T14:30:00Z" or "2025-01-15T14:30:00.000Z"
  // Extract the time portion directly WITHOUT timezone conversion
  const match = timestamp.match(/T(\d{2}:\d{2})/)
  return match ? match[1] : null
}

// Usage:
start_time: targetEventDate?.start_time || extractTimeFromTimestamp(event.start_date),
```

**Warning:** This assumes the stored timestamp represents local time (which may not be correct if users are in different timezones). Ideally, legacy events should be migrated.

---

### Option C: Store Times as Plain Text/TIME (Long-Term)

For any new time-related columns, always use:
- PostgreSQL `TIME` (without time zone) for times
- PostgreSQL `DATE` for dates
- Never use `TIMESTAMP WITH TIME ZONE` for event times that should remain fixed regardless of viewer timezone

---

## 7. Files Changed

| File | Line | Change | Status |
|------|------|--------|--------|
| `src/app/api/events/[id]/logistics/route.ts` | 374-377 | Removed time fallback | ✅ FIXED |
| `src/app/api/public/logistics/[publicId]/route.ts` | 352-355 | Removed time fallback | ✅ FIXED |
| `src/lib/pdf/generators/logistics.ts` | 117-126 | Fixed date-only string parsing | ✅ FIXED |
| `src/lib/pdf/utils.ts` | 74-77 | Fixed formatDate() for date-only strings | ✅ FIXED |

---

## 8. Testing Recommendations

1. **Create test event with event_dates:**
   - Set start_time to 14:00 (2:00 PM)
   - Verify logistics page shows 2:00 PM regardless of browser timezone

2. **Test legacy event (if fallback kept):**
   - Create event without event_dates record
   - Verify time displays correctly

3. **Test across timezones:**
   - Access from browsers set to different timezones
   - Event times should remain constant

---

## 9. Summary

| Category | Count | Details |
|----------|-------|---------|
| **Bugs Fixed** | 4 | 2 API routes (time extraction), 2 PDF files (date shifting) |
| **Safe Utilities** | 3 | `formatTime()` in date-utils, EventLogistics, merge-fields |
| **Lower Priority** | 3 | Date display using toLocaleDateString for event dates |

**Completed:**
1. ✅ Audit completed
2. ✅ Fix approach: Option A (remove fallback) + PDF date fix
3. ✅ All 4 files fixed and committed
4. 🔲 Test thoroughly across timezones (recommended)
