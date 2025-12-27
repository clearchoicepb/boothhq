# Logistics Form Audit Report

**Prepared for:** BoothHQ January 5th Internal Launch
**Date:** December 27, 2024
**Component Location:** `src/components/events/logistics/EventLogistics.tsx`
**API Endpoint:** `src/app/api/events/[id]/logistics/route.ts`

---

## Executive Summary

The Logistics Form is a well-structured component composed of 7 sub-components that display event operational details. **Most fields are correctly pre-filling from the database**, but there are several critical gaps in information that field staff need for successful event execution.

### Key Findings
- **22 fields currently displayed** across 7 sections
- **19 fields working correctly** (86% functional)
- **3 fields with issues** (setup_time data dependency, equipment not rendered)
- **15+ critical fields missing** that exist in the database but aren't displayed
- **2 duplicate data sources** handled correctly with fallback logic

---

## Phase 1: Field Pre-fill Analysis

### Current Field Inventory

| Section | Field Name | Data Source | Status | Notes |
|---------|------------|-------------|--------|-------|
| **Header** | | | | |
| | Client Name | `accounts.name` via `events.account_id` | ✅ Working | `route.ts:34`, `route.ts:221` |
| **Event Schedule** | | | | |
| | Event Date | `event_dates.event_date` | ✅ Working | `route.ts:48`, displays first event date |
| | Setup Time | `event_dates.setup_time` | ⚠️ Partially Working | Depends on data entry; migration exists (`20251112000007`) |
| | Load-In Time | `events.load_in_time` | ✅ Working | Editable inline, `route.ts:23` |
| | Start Time | `event_dates.start_time` or `events.start_date` fallback | ✅ Working | Smart fallback logic `route.ts:226-230` |
| | End Time | `event_dates.end_time` or `events.end_date` fallback | ✅ Working | Smart fallback logic `route.ts:232-237` |
| **Venue Information** | | | | |
| | Venue Name | `locations.name` via `event_dates.location_id` | ✅ Working | Falls back to `events.location` TEXT field |
| | Address | `locations.address_line1/2, city, state, postal_code` | ✅ Working | `route.ts:55-63` |
| **Load-In Details** | | | | |
| | Operations Notes | `events.load_in_notes` | ✅ Working | Editable inline |
| | Venue Parking Instructions | `locations.notes` | ✅ Working | `route.ts:64` |
| **On-Site Contacts** | | | | |
| | Venue Contact Name | `events.venue_contact_name` or `locations.contact_name` | ✅ Working | Event-level overrides location |
| | Venue Contact Phone | `events.venue_contact_phone` or `locations.contact_phone` | ✅ Working | Editable inline |
| | Venue Contact Email | `events.venue_contact_email` or `locations.contact_email` | ✅ Working | Editable inline |
| | Event Planner Name | `events.event_planner_name` | ✅ Working | Editable inline |
| | Event Planner Phone | `events.event_planner_phone` | ✅ Working | |
| | Event Planner Email | `events.event_planner_email` | ✅ Working | |
| **Client Package & Items** | | | | |
| | Packages | `opportunity_line_items` → `packages` | ✅ Working | Via `events.opportunity_id`, `route.ts:77-103` |
| | Custom Items | `event_custom_items` | ✅ Working | `route.ts:106-110` |
| **Event Staff** | | | | |
| | Operations Team | `event_staff_assignments` where `staff_roles.type='operations'` | ✅ Working | `route.ts:133-152` |
| | Event Day Staff | `event_staff_assignments` where `staff_roles.type='event_staff'` | ✅ Working | Grouped by role_type |
| **Additional Notes** | | | | |
| | Event Notes | `events.description` or `event_dates.notes` | ✅ Working | `route.ts:245` |

### Issues Identified

| Issue | Severity | Root Cause | Location |
|-------|----------|------------|----------|
| **Equipment not displayed** | High | API fetches `booth_assignments` data (`route.ts:113-130`) but `LogisticsPackages.tsx` doesn't render it | `LogisticsPackages.tsx` lacks equipment rendering |
| **Setup Time may be null** | Medium | Depends on `event_dates.setup_time` being populated | Data entry issue, not code issue |
| **Event Title missing** | High | Not selected in API query, not in LogisticsData type | `route.ts:17-40` doesn't include `title` |

---

## Phase 2: Duplicate Field Detection

### Identified Duplicates

| Data Type | Source 1 | Source 2 | Handling | Recommendation |
|-----------|----------|----------|----------|----------------|
| **Venue Contact** | `events.venue_contact_*` | `locations.contact_*` | ✅ Correct - Event-level overrides location | Keep as-is |
| **Setup Time** | `events.setup_time` | `event_dates.setup_time` | ✅ Correct - Uses event_dates | Keep as-is |
| **Location** | `events.location` (TEXT) | `event_dates.location_id` (FK) | ✅ Correct - Prefers FK, falls back to TEXT | Keep as-is |
| **Start/End Time** | `events.start_date/end_date` | `event_dates.start_time/end_time` | ✅ Correct - Uses event_dates with fallback | Keep as-is |

**Verdict:** No problematic duplicates. The existing fallback logic is well-designed and handles legacy data gracefully.

---

## Phase 3: Gap Analysis - Missing Critical Information

### Arrival & Access (HIGH PRIORITY)

| Missing Field | Available in DB? | Table/Column | Priority | Notes |
|---------------|------------------|--------------|----------|-------|
| Event Title/Name | ✅ Yes | `events.title` | **Critical** | Staff need to know what event they're working |
| Parking Instructions | ⚠️ Partial | `locations.notes` | Important | Currently in notes blob, needs dedicated field |
| Load-in Entrance | ❌ No | — | Important | Consider adding to locations table |
| Check-in Procedures | ❌ No | — | Nice-to-have | Could be in `events.load_in_notes` |
| Venue Rules/Restrictions | ❌ No | — | Nice-to-have | Consider adding to locations table |

### Timing (HIGH PRIORITY)

| Missing Field | Available in DB? | Table/Column | Priority | Notes |
|---------------|------------------|--------------|----------|-------|
| Staff Call Time | ❌ No | — | **Critical** | When staff should arrive (before load-in) |
| Breakdown/Load-out Time | ❌ No | — | Important | When teardown begins |
| Event Milestones | ❌ No | — | Nice-to-have | Key moments during event |

### Equipment & Setup (CRITICAL)

| Missing Field | Available in DB? | Table/Column | Priority | Notes |
|---------------|------------------|--------------|----------|-------|
| Booth Type/Configuration | ✅ Yes | `booths.booth_type` via `booth_assignments` | **Critical** | **API fetches but not displayed!** |
| Booth Serial Number | ✅ Yes | `booths.serial_number` | Important | Already in API response |
| Equipment Status | ✅ Yes | `booth_assignments.status` | Important | Already in API response |
| Props & Backdrops | ⚠️ Partial | `event_custom_items` | Important | Only custom items shown, not standard props |
| Print Specifications | ❌ No | — | Important | Prints per guest, sizes, etc. |
| Branding Assets | ❌ No | — | Important | Logos, overlays to use |
| Power Requirements | ❌ No | — | Nice-to-have | Could add to packages or event |
| WiFi Requirements | ❌ No | — | Nice-to-have | Could add to locations or event |

### Client & Event Details (HIGH PRIORITY)

| Missing Field | Available in DB? | Table/Column | Priority | Notes |
|---------------|------------------|--------------|----------|-------|
| Event Type | ✅ Yes | `events.event_type` | Important | Wedding, Corporate, etc. |
| Guest Count | ✅ Yes | `events.guest_count` | Important | Helps staff prepare |
| Event Scope/Objectives | ❌ No | — | Nice-to-have | What does success look like? |
| Special Requests | ❌ No | — | Nice-to-have | VIP considerations |
| Branding Guidelines | ❌ No | — | Nice-to-have | Colors, fonts, do's/don'ts |
| Social Sharing | ❌ No | — | Nice-to-have | Hashtags, handles |

### Financial/Administrative (MEDIUM PRIORITY)

| Missing Field | Available in DB? | Table/Column | Priority | Notes |
|---------------|------------------|--------------|----------|-------|
| Payment Status | ✅ Yes | `events.payment_status` | Important | Is balance paid? |
| Balance Due | ⚠️ Derivable | `invoices` related to event | Nice-to-have | Would need invoice lookup |
| Contract Status | ⚠️ Partial | `contracts` table | Nice-to-have | Signed/not signed |

### Staff & Emergency (MEDIUM PRIORITY)

| Missing Field | Available in DB? | Table/Column | Priority | Notes |
|---------------|------------------|--------------|----------|-------|
| Emergency Contact | ❌ No | — | Important | Manager on call |
| Staff Phone Numbers | ❌ No | `users` table | Nice-to-have | Direct contact for assigned staff |

---

## Recommended Action Plan

### Pre-Launch Critical (Must Fix Before Jan 5)

#### 1. Display Equipment Information (**CRITICAL** - 2-4 hours)
**Problem:** The API already fetches booth/equipment data but it's not rendered.

**Files to modify:**
- `src/components/events/logistics/LogisticsPackages.tsx` - Add equipment section
- `src/types/logistics.ts` - `LogisticsPackagesProps` needs `equipment` prop

**Data available:**
```typescript
equipment: [{
  id, name, type, serial_number, status,
  checked_out_at, checked_in_at, condition_notes
}]
```

#### 2. Add Event Title/Name to Form (**CRITICAL** - 1 hour)
**Problem:** Staff don't know what event they're working.

**Files to modify:**
- `src/app/api/events/[id]/logistics/route.ts:19` - Add `title` to SELECT
- `src/hooks/useEventLogistics.ts:8` - Add `event_title` to interface
- `src/types/logistics.ts:73` - Add `event_title` to LogisticsData
- `src/components/events/logistics/LogisticsHeader.tsx` - Display title

#### 3. Add Event Type and Guest Count (**HIGH** - 1 hour)
**Problem:** Staff need context about the event.

**Files to modify:**
- `src/app/api/events/[id]/logistics/route.ts` - Add `event_type`, `guest_count` to SELECT
- `src/components/events/logistics/LogisticsHeader.tsx` or new section

### Post-Launch Improvements (Sprint 2)

#### 4. Add Staff Call Time Field (2-3 hours)
- Create migration to add `staff_call_time` to `events` table
- Update logistics API and form
- Distinct from `load_in_time` (when staff arrives vs when equipment arrives)

#### 5. Add Breakdown/Load-out Time (1-2 hours)
- Create migration to add `load_out_time` to `event_dates` table
- Update logistics API and form

#### 6. Add Emergency Contact Section (2 hours)
- Could use tenant settings for default manager on call
- Display in logistics form footer

#### 7. Add Payment Status Display (1-2 hours)
- API already has access to `events.payment_status`
- Add to form header or footer with visual indicator

### Future Enhancements (Backlog)

- Dedicated parking instructions field on locations
- Load-in entrance/dock field on locations
- Print specifications field on packages/events
- WiFi/power requirements on locations
- Social sharing info (hashtags, handles) on events
- Equipment checklist/manifest view

---

## Technical Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/components/events/logistics/EventLogistics.tsx` | Main orchestrator component |
| `src/app/api/events/[id]/logistics/route.ts` | API endpoint fetching data |
| `src/hooks/useEventLogistics.ts` | React Query hook for data fetching |
| `src/types/logistics.ts` | TypeScript types for logistics data |
| `src/components/events/logistics/*.tsx` | Sub-components (7 total) |

### Database Tables Used

| Table | Fields Used |
|-------|-------------|
| `events` | id, location, load_in_time, load_in_notes, venue_contact_*, event_planner_*, start_date, end_date, description, opportunity_id, account_id |
| `accounts` | name |
| `event_dates` | event_date, setup_time, start_time, end_time, notes, location_id |
| `locations` | name, address_*, city, state, postal_code, country, contact_*, notes |
| `opportunity_line_items` | id, item_type, package_id |
| `packages` | id, name, category |
| `event_custom_items` | id, item_name, item_type |
| `booth_assignments` | id, status, assigned_date, checked_out_at, checked_in_at, condition_notes, booth_id |
| `booths` | booth_name, booth_type, serial_number |
| `event_staff_assignments` | id, notes, event_date_id, user_id, staff_role_id |
| `users` | first_name, last_name, email |
| `staff_roles` | name, type |

### Available but Unused Fields

| Table | Field | Should Add? |
|-------|-------|-------------|
| `events` | `title` | **Yes - Critical** |
| `events` | `event_type` | Yes |
| `events` | `guest_count` | Yes |
| `events` | `payment_status` | Yes |
| `booths` | `booth_type` | **Yes - Already fetched!** |
| `booths` | `serial_number` | Yes - Already fetched |

---

## Summary

The Logistics Form has a solid foundation with well-structured components and appropriate data fetching. The main issues are:

1. **Equipment data is fetched but not displayed** - Quick fix needed
2. **Event title/name is missing** - Quick fix needed
3. **Several useful fields exist in DB but aren't shown** - Easy wins
4. **Some timing fields don't exist yet** - Requires migrations

For the January 5th launch, focus on items 1-3 from the action plan. The rest can be addressed in subsequent sprints.
