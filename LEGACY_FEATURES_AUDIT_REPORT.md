# BoothHQ Legacy Features Audit Report

**Date:** 2026-01-01
**Auditor:** Claude Code
**Scope:** Legacy Badge on Contacts & Event Status Auto-Complete

---

## ISSUE 1: "Legacy" Badge on Contacts

### Executive Summary

The "Legacy" badge is **NOT stored as a database column**. Instead, it's a **computed/derived status** based on data patterns - specifically, contacts that have an `account_id` set (old linking method) but no entries in the `contact_accounts` junction table (new many-to-many relationship).

---

### DATABASE

| Attribute | Value |
|-----------|-------|
| **Table** | `contacts` |
| **Column** | N/A - No dedicated "legacy" column exists |
| **Data type** | N/A |
| **Default value** | N/A |
| **How "legacy" is determined** | Computed at runtime: `account_id IS NOT NULL` AND `contact_accounts` has no entries |

The system has two contact-account linking methods:
1. **Legacy (deprecated):** `contacts.account_id` - direct FK to accounts
2. **Current:** `contact_accounts` junction table - many-to-many relationship with roles

---

### CODE REFERENCES

| File | Description |
|------|-------------|
| `src/app/[tenant]/contacts/[id]/page.tsx:416-443` | Shows "Legacy Account Link" section when contact has `account_name` but no `all_accounts` array |
| `src/components/events/event-account-contact-card.tsx:145-158` | Shows "Legacy" badge when event has `contact_name` but no `primary_contact` |
| `src/app/[tenant]/accounts/[id]/page.tsx:772-792` | Shows "Legacy Contact Links Detected" when account has `legacy_contacts` but no `all_contacts` |
| `src/app/api/contacts/route.ts:171-189` | Creates junction table entry when contact is created with account_id |
| `src/app/api/contacts/[id]/route.ts` | Updates contact data and junction table entries |
| `scripts/analyze-contact-data-legacy.ts` | Analysis script for legacy contact data |

---

### UI LOCATIONS

| Component/Page | Where Badge Appears |
|----------------|---------------------|
| Contact Detail Page | Shows amber "Legacy Account Link" section with link to associated account |
| Account Detail Page | Shows amber "Legacy Contact Links Detected" banner listing legacy-linked contacts |
| Event Account/Contact Card | Shows "Legacy" badge when event uses old `contact_id` instead of `primary_contact_id` |

---

### POTENTIAL CAUSE OF RANDOM ASSIGNMENT TO NEW CONTACTS

**Root Cause Identified:** `src/app/api/contacts/route.ts:184-188`

When a new contact is created with an `account_id`:
1. The contact is created with `account_id` set (legacy link) - **Line 160-164**
2. A `contact_accounts` junction entry is created - **Line 173-182**
3. **BUT** if the junction insert fails, the error is only logged, not propagated - **Line 184-188**

```typescript
if (junctionError) {
  log.error({ junctionError }, 'Failed to create contact_accounts entry')
  // Don't fail the request, but log the error
  // The contact was created successfully, junction entry is supplementary
}
```

**Consequences:**
- Contact is created with `account_id` (legacy link)
- Junction table entry fails silently
- Contact appears with "Legacy Account Link" badge because it has `account_id` but no `contact_accounts` entry

**Possible failure scenarios for junction insert:**
- Database constraint violations
- Concurrent requests causing race conditions
- Missing `tenant_id` or other required fields
- Database connection issues during the second insert

---

## ISSUE 2: Event Status Auto-Completing Prematurely

### Executive Summary

**NO automated process exists that changes event status to "completed".** The only place where events receive "completed" status is in the **seed data generation** script, which sets past-date events to "completed" during demo data creation.

---

### DATABASE

| Attribute | Value |
|-----------|-------|
| **Table** | `events` |
| **Column** | `status` (VARCHAR/TEXT) |
| **Possible values** | `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| **Default value** | `'scheduled'` (set in API, not database constraint) |

**Status Distribution Query:**
```sql
SELECT status, COUNT(*)
FROM events
GROUP BY status;
```

---

### AUTO-UPDATE LOGIC FOUND

| File | Description |
|------|-------------|
| `src/app/api/seed-data/route.ts:364` | **SEED DATA ONLY** - Sets past events to 'completed' during demo data creation |

**Seed data logic (line 363-365):**
```typescript
let status = 'confirmed'
if (isPast) status = random(['completed', 'completed', 'completed', 'cancelled'])
else status = random(['scheduled', 'confirmed', 'confirmed', 'confirmed'])
```

**No other auto-completion logic found:**
- ✅ No cron jobs update event status to "completed"
- ✅ No database triggers affect event status
- ✅ No workflow actions auto-complete events
- ✅ No frontend computed/derived status logic

---

### CRON JOBS REVIEWED

| Cron Path | Schedule | Purpose |
|-----------|----------|---------|
| `/api/cron/maintenance` | 6 AM daily | Equipment maintenance notifications |
| `/api/cron/opportunities` | 6 AM daily | Stale opportunities + auto-close when event date passed (NOT events) |
| `/api/cron/consumables` | 8 AM, 2 PM, 8 PM | Consumable inventory alerts |
| `/api/cron/notifications` | 9 AM daily | General notifications |

**None of these affect event status.**

---

### UI LOCATIONS WHERE STATUS APPEARS

| Component/Page | How Status is Used |
|----------------|-------------------|
| `src/components/events/event-status-badge.tsx` | Badge component with color coding |
| `src/components/events/event-information-card.tsx` | Displays status in event info section |
| `src/components/events/event-key-metrics-cards.tsx` | Shows status in overview cards |
| `src/components/events/event-dates-card.tsx` | Event date status display |
| `src/components/events/detail/shared/StickyEventContext.tsx` | Sticky header status display |
| Events list page | Filtering and display |

---

### DEPENDENCIES (Features Relying on Status)

| Feature | How It Uses Status |
|---------|-------------------|
| **Event Filtering** | `statusFilter` in `src/types/events.ts` allows filtering by status |
| **Event Stats** | `src/app/api/events/stats/route.ts` counts events by status |
| **Workflow Conditions** | `src/types/workflows.ts` supports `event.status` as condition field |
| **Event Lifecycle Progress** | Visual progress bar considers status for stage display |
| **Reporting** | Event status used in various reports/exports |

---

### RECOMMENDED REPLACEMENT FOR UI

If removing status entirely, consider:

1. **Computed Status Based on Dates:**
   - `upcoming` = first event date > today
   - `in_progress` = today is within event date range
   - `past` = last event date < today
   - Manual `cancelled` flag could remain

2. **Simplified Status Model:**
   - Remove `completed` entirely (use date-based computation)
   - Keep only: `confirmed`, `cancelled`
   - Everything else computed from dates

---

## RISK ASSESSMENT

### Issue 1: Legacy Badge Removal

| Risk Level | Assessment |
|------------|------------|
| **LOW** | Safe to remove the legacy badge display |
| **MEDIUM** | Need to ensure contacts don't get stuck in "legacy" state |

**Recommended Approach:**
1. **Phase 1 (Safe):** Remove the UI badge/warning - it's purely visual
2. **Phase 2:** Create a migration script to sync `account_id` → `contact_accounts` for all contacts
3. **Phase 3:** Consider removing `contacts.account_id` column entirely (requires code cleanup)

**Fix for New Contacts Bug:**
Change `src/app/api/contacts/route.ts` to either:
- Fail the entire request if junction insert fails (transaction rollback)
- Clear `account_id` if junction insert fails
- Log warning but also create a retry mechanism

---

### Issue 2: Event Status Auto-Complete Removal

| Risk Level | Assessment |
|------------|------------|
| **LOW** | No automated process to remove |
| **MEDIUM** | Seed data creates "completed" status - affects demo/test data |

**Findings:**
- There is **NO** auto-completion of events in production
- Events with "completed" status likely came from:
  1. Seed data generation
  2. Manual status changes
  3. Data imports/migrations

**Recommended Approach:**
1. **Investigation:** Query database to see when events were marked completed
2. **If truly unwanted:** Add constraint preventing "completed" status
3. **UI Update:** Consider making status a computed field based on event dates

---

## QUESTIONS BEFORE PROCEEDING

### Issue 1:
1. Should we also remove the `contacts.account_id` column, or keep it for backwards compatibility?
2. How many contacts currently have the legacy pattern (account_id set, no junction entry)?
3. Should failed junction inserts fail the entire contact creation request?

### Issue 2:
1. Are there specific events showing as "completed" that shouldn't be? (Need IDs for investigation)
2. Should we add a database constraint preventing "completed" status?
3. Do you want status to become a computed value based on dates?

---

## SUMMARY TABLE

| Issue | Root Cause | Removal Complexity | Recommended Action |
|-------|------------|-------------------|-------------------|
| Legacy Badge | Data pattern detection, not stored boolean | LOW | Remove UI + fix junction insert error handling |
| Event Auto-Complete | Only in seed data - no runtime auto-completion | LOW | Investigate specific events, update seed data |
