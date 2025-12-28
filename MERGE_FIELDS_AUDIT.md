# Merge Fields Audit Report

**Generated:** December 28, 2025
**Branch:** claude/audit-merge-fields-qwTWA

## Executive Summary

This audit identified **25+ broken or missing merge field mappings** in the template system. The primary issues are:

1. **Missing mappings** - Merge fields used in templates have no corresponding code to populate them
2. **Field name mismatches** - Template field names don't match the processing function's expected names
3. **Data source issues** - Some fields look for data in wrong database columns/tables

---

## System Architecture

### Two Separate Merge Field Systems

| System | File Location | Purpose |
|--------|---------------|---------|
| Template/Agreement System | `src/lib/merge-fields.ts` | Contracts, emails, SMS templates |
| Event Form System | `src/lib/event-forms/available-merge-fields.ts` | Pre-populating event forms |

### Processing Flow

```
Template Content → replaceMergeFields() → getMergeFieldData() → Populated Content
```

**Key Files:**
- `src/lib/merge-fields.ts:98` - `replaceMergeFields()` function
- `src/lib/merge-fields.ts:164` - `getMergeFieldData()` function
- `src/components/ui/rich-text-editor.tsx:125` - Available merge fields in UI

---

## Audit Results Table

### Legend
- ✅ **Working** - Field is mapped and data source exists
- ❌ **Missing** - No mapping in processing function
- ⚠️ **Mismatch** - Template name differs from code
- 🔧 **Data Issue** - Mapping exists but data source is wrong

### Event Fields

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{event_title}}` | ✅ Yes | `event_title` | `events.title` | ✅ Working |
| `{{event_location}}` | ✅ Yes | `event_location` | `locations.name` (via event_dates) | ✅ Working |
| `{{event_start_date}}` | ✅ Yes | `event_start_date` | `event_dates.event_date` | ✅ Working |
| `{{event_end_date}}` | ✅ Yes | `event_end_date` | `event_dates.event_date` (last) | ✅ Working |
| `{{event_start_time}}` | ✅ Yes | `event_start_time` | `event_dates.start_time` | ✅ Working |
| `{{event_end_time}}` | ✅ Yes | `event_end_time` | `event_dates.end_time` | ✅ Working |
| `{{event_setup_time}}` | ✅ Yes | `event_setup_time` | ❌ `events.setup_time` (doesn't exist!) | 🔧 Data Issue |
| `{{event_load_in_notes}}` | ✅ Yes | `event_load_in_notes` | `events.load_in_notes` | ✅ Working |
| `{{event_total_amount}}` | ✅ Yes | `event_total_amount` | Calculated from invoices | ✅ Working |
| `{{event_date}}` | ✅ Yes (legacy) | `event_date` | `opportunity.event_date` | ✅ Working |
| `{{setup_date}}` | ✅ Yes | ❌ Not mapped | `event_dates.event_date`? | ❌ Missing |
| `{{setup_time}}` | ✅ Yes | `setup_time` (legacy) | ❌ `events.setup_time` (doesn't exist!) | 🔧 Data Issue |

### Location Fields

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{location_name}}` | ✅ Yes | ❌ Not mapped | `locations.name` | ❌ Missing |
| `{{location_address}}` | ✅ Yes | ❌ Not mapped | `locations.address_line1` | ❌ Missing |
| `{{location_city}}` | ✅ Yes | ❌ Not mapped | `locations.city` | ❌ Missing |
| `{{location_state}}` | ✅ Yes | ❌ Not mapped | `locations.state` | ❌ Missing |
| `{{location_zip}}` | ✅ Yes | ❌ Not mapped | `locations.postal_code` | ❌ Missing |

### Contact Fields

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{contact_full_name}}` | ✅ Yes | `contact_full_name` | Computed | ✅ Working |
| `{{contact_first_name}}` | ✅ Yes | `contact_first_name` | `contacts.first_name` | ✅ Working |
| `{{contact_last_name}}` | ✅ Yes | `contact_last_name` | `contacts.last_name` | ✅ Working |
| `{{contact_email}}` | ✅ Yes | `contact_email` | `contacts.email` | ✅ Working |
| `{{contact_phone}}` | ✅ Yes | `contact_phone` | `contacts.phone` | ✅ Working |
| `{{contact_name}}` | ✅ Yes | `contact_name` (legacy) | Computed full name | ✅ Working |

### Account Fields

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{account_name}}` | ✅ Yes | `account_name` | `accounts.name` | ✅ Working |
| `{{account_phone}}` | ✅ Yes | `account_phone` | `accounts.phone` | ✅ Working |
| `{{account_email}}` | ✅ Yes | `account_email` | `accounts.email` | ✅ Working |
| `{{account_billing_address}}` | ✅ Yes | `account_billing_address` | Multiple columns | 🔧 Data Issue |
| `{{account_shipping_address}}` | ✅ Yes | `account_shipping_address` | Multiple columns | 🔧 Data Issue |
| `{{company_name}}` | ✅ Yes (legacy) | `company_name` | `accounts.name` | ✅ Working |

### Invoice Fields

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{invoice_total}}` | ✅ Yes | `invoice_total` | `invoices.total_amount` | ✅ Working |
| `{{invoice_amount_due}}` | ✅ Yes | `invoice_amount_due` | Calculated | ✅ Working |
| `{{invoice_deposit_amount}}` | ✅ Yes | `invoice_deposit_amount` | Line item search | ⚠️ Unreliable |
| `{{invoice_balance_due}}` | ✅ Yes | `invoice_balance_due` | Calculated | ✅ Working |
| `{{invoice_amount_paid}}` | ✅ Yes | `invoice_amount_paid` | Calculated | ✅ Working |
| `{{invoice_due_date}}` | ✅ Yes | `invoice_due_date` | `invoices.due_date` | ✅ Working |
| `{{invoice_payment_terms}}` | ✅ Yes | `invoice_payment_terms` | ❌ Column missing | 🔧 Data Issue |
| `{{invoice_number}}` | ✅ Yes | `invoice_number` | `invoices.invoice_number` | ✅ Working |
| `{{invoice_issue_date}}` | ✅ Yes | `invoice_issue_date` | `invoices.issue_date` | ✅ Working |
| `{{invoice_status}}` | ✅ Yes | `invoice_status` | `invoices.status` | ✅ Working |
| `{{total_amount}}` | ✅ Yes | ❌ Not mapped | Should use `event_total_amount` | ❌ Missing |
| `{{deposit_amount}}` | ✅ Yes | ❌ Not mapped | Should use `invoice_deposit_amount` | ❌ Missing |
| `{{balance_due_date}}` | ✅ Yes | ❌ Not mapped | Should use `invoice_due_date` | ❌ Missing |
| `{{total_price}}` | ✅ Yes | ❌ Not mapped | Should use `event_total_amount` | ❌ Missing |

### Package/Line Item Fields (Template Section)

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{package_name}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{package_description}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{package_price}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{line_item_1}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{line_item_2}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{description_1}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{description_2}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{price_1}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{price_2}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{discount_amount}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |

### Provider/System Fields (Template Section)

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{agreement_type}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{current_date}}` | ✅ Yes | ❌ Not mapped | N/A | ❌ Missing |
| `{{company_address}}` | ✅ Yes (provider) | ❌ Not mapped | Tenant settings? | ❌ Missing |
| `{{company_city}}` | ✅ Yes (provider) | ❌ Not mapped | Tenant settings? | ❌ Missing |
| `{{company_state}}` | ✅ Yes (provider) | ❌ Not mapped | Tenant settings? | ❌ Missing |
| `{{company_zip}}` | ✅ Yes (provider) | ❌ Not mapped | Tenant settings? | ❌ Missing |

### Client Address Fields (Template Section)

| Merge Field | Template Uses | Processing Maps | DB Column | Status |
|-------------|---------------|-----------------|-----------|--------|
| `{{address}}` | ✅ Yes | ❌ Not mapped | `contacts.address` or `accounts.billing_address_line_1`? | ❌ Missing |
| `{{city}}` | ✅ Yes | ❌ Not mapped | `contacts.city` or `accounts.billing_city`? | ❌ Missing |
| `{{state}}` | ✅ Yes | ❌ Not mapped | `contacts.state` or `accounts.billing_state`? | ❌ Missing |
| `{{zip}}` | ✅ Yes | ❌ Not mapped | `contacts.postal_code` or `accounts.billing_zip_code`? | ❌ Missing |
| `{{phone}}` | ✅ Yes | `phone` (legacy) | `contacts.phone` | ✅ Working |

---

## Detailed Issue Analysis

### Issue 1: `event_setup_time` / `setup_time` Data Source Bug

**Location:** `src/lib/merge-fields.ts:187-192`

**Problem:** The code fetches `event.setup_time` but the `events` table has NO `setup_time` column. The `setup_time` field exists on the `event_dates` table.

```typescript
// CURRENT CODE (BROKEN)
data.event_setup_time = event.setup_time  // events table has no setup_time!
data.setup_time = event.setup_time        // Same issue
```

**Impact:** `{{event_setup_time}}` and `{{setup_time}}` always return empty.

---

### Issue 2: Account Address Formatting Bug

**Location:** `src/lib/merge-fields.ts:237-246`

**Problem:** The `formatAddress()` function expects object properties `street1`, `street2`, `city`, `state`, `zip`/`postal_code`, but the API returns account data with column names `billing_address_line_1`, `billing_address_line_2`, etc.

```typescript
// formatAddress expects:
{ street1, street2, city, state, zip, postal_code, country }

// But accounts API returns:
{ billing_address_line_1, billing_address_line_2, billing_city, billing_state, billing_zip_code }
```

**Impact:** `{{account_billing_address}}` and `{{account_shipping_address}}` are always empty or malformed.

---

### Issue 3: Missing Location Fields

**Location:** `src/lib/merge-fields.ts` (getMergeFieldData function)

**Problem:** The code fetches location data (`firstDate.locations`) but only uses `locations.name` for `event_location`. It never extracts:
- `location_name`
- `location_address`
- `location_city`
- `location_state`
- `location_zip`

**Impact:** All location-specific merge fields in templates remain as literal `{{location_*}}` text.

---

### Issue 4: Missing Template Section Fields

**Location:** Seeded template sections in `supabase/migrations/20250131220002_seed_system_sections.sql`

**Problem:** The seeded system sections use many merge fields that have no mapping:
- Agreement metadata: `{{agreement_type}}`, `{{current_date}}`
- Provider info: `{{company_address}}`, `{{company_city}}`, `{{company_state}}`, `{{company_zip}}`
- Client address: `{{address}}`, `{{city}}`, `{{state}}`, `{{zip}}`
- Package/pricing: All package and line item fields
- Date aliases: `{{setup_date}}`, `{{balance_due_date}}`

---

### Issue 5: Inconsistent Field Naming

Some fields have multiple names for the same data:

| Concept | Template Section Uses | Rich Text Editor Uses | Processing Maps |
|---------|----------------------|----------------------|-----------------|
| Total amount | `{{total_amount}}`, `{{total_price}}` | `{{event_total_amount}}` | `event_total_amount` |
| Deposit | `{{deposit_amount}}` | `{{invoice_deposit_amount}}` | `invoice_deposit_amount` |
| Balance due date | `{{balance_due_date}}` | `{{invoice_due_date}}` | `invoice_due_date` |
| Client name | `{{contact_name}}` | `{{contact_full_name}}` | `contact_full_name`, `contact_name` |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| ✅ Working fields | 22 |
| ❌ Missing mappings | 25 |
| 🔧 Data source issues | 5 |
| ⚠️ Unreliable/partial | 1 |
| **Total fields audited** | **53** |

---

## Recommended Fixes

### Fix 1: Setup Time Data Source (HIGH PRIORITY)

**File:** `src/lib/merge-fields.ts`
**Lines:** 187-192

**Current (Broken):**
```typescript
data.event_setup_time = event.setup_time
data.setup_time = event.setup_time
```

**Fixed:**
```typescript
// Get setup_time from first event_date, not from event
if (event.event_dates && event.event_dates.length > 0) {
  const firstDate = [...event.event_dates].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )[0]
  data.event_setup_time = firstDate.setup_time
  data.setup_time = firstDate.setup_time
}
```

---

### Fix 2: Add Location Fields (HIGH PRIORITY)

**File:** `src/lib/merge-fields.ts`
**Location:** Inside the event_dates processing block (around line 209)

**Add these fields after `data.event_location = firstDate.locations.name`:**

```typescript
if (firstDate.locations) {
  data.event_location = firstDate.locations.name

  // Add location-specific fields
  data.location_name = firstDate.locations.name
  data.location_address = firstDate.locations.address_line1
  data.location_city = firstDate.locations.city
  data.location_state = firstDate.locations.state
  data.location_zip = firstDate.locations.postal_code
}
```

**Also add to MergeFieldData interface:**
```typescript
// Location data
location_name?: string
location_address?: string
location_city?: string
location_state?: string
location_zip?: string
```

---

### Fix 3: Fix Account Address Formatting (HIGH PRIORITY)

**File:** `src/lib/merge-fields.ts`
**Lines:** 237-246

**Current (Broken):**
```typescript
if (event.accounts.billing_address) {
  const addr = event.accounts.billing_address
  data.account_billing_address = formatAddress(addr)
}
```

**Problem:** The code expects a nested object but the API returns flat columns.

**Option A - Fix the formatAddress call:**
```typescript
// Construct address object from flat columns
const billingAddr = {
  street1: event.accounts.billing_address_line_1,
  street2: event.accounts.billing_address_line_2,
  city: event.accounts.billing_city,
  state: event.accounts.billing_state,
  zip: event.accounts.billing_zip_code,
}
data.account_billing_address = formatAddress(billingAddr)

const shippingAddr = {
  street1: event.accounts.shipping_address_line_1,
  street2: event.accounts.shipping_address_line_2,
  city: event.accounts.shipping_city,
  state: event.accounts.shipping_state,
  zip: event.accounts.shipping_zip_code,
}
data.account_shipping_address = formatAddress(shippingAddr)
```

---

### Fix 4: Add Alias Mappings (MEDIUM PRIORITY)

**File:** `src/lib/merge-fields.ts`
**Location:** End of getMergeFieldData function, before return

**Add these alias mappings to support seeded template sections:**

```typescript
// Alias mappings for backward compatibility with template sections
// Total amount aliases
if (data.event_total_amount) {
  data.total_amount = data.event_total_amount
  data.total_price = data.event_total_amount
}

// Deposit aliases
if (data.invoice_deposit_amount) {
  data.deposit_amount = data.invoice_deposit_amount
}

// Date aliases
if (data.invoice_due_date) {
  data.balance_due_date = data.invoice_due_date
}

// Setup date (first event date)
if (data.event_start_date) {
  data.setup_date = data.event_start_date
}

// Client address fields (from contact or account)
if (data.contact_first_name || data.contact_last_name) {
  // Use contact address if available
  // This would need contact address fields to be fetched
}
data.address = data.account_billing_address // Or from contact
```

**Also add to MergeFieldData interface:**
```typescript
// Alias fields for template compatibility
total_amount?: number
total_price?: number
deposit_amount?: number
balance_due_date?: string
setup_date?: string
address?: string
city?: string
state?: string
zip?: string
```

---

### Fix 5: Add System/Provider Fields (LOW PRIORITY)

**File:** `src/lib/merge-fields.ts`

These fields require tenant settings to be passed to getMergeFieldData:

```typescript
interface MergeFieldParams {
  // ... existing params
  tenantSettings?: {
    companyName?: string
    companyAddress?: string
    companyCity?: string
    companyState?: string
    companyZip?: string
  }
  agreementType?: string
}

// In getMergeFieldData:
if (params.tenantSettings) {
  data.company_address = params.tenantSettings.companyAddress
  data.company_city = params.tenantSettings.companyCity
  data.company_state = params.tenantSettings.companyState
  data.company_zip = params.tenantSettings.companyZip
}

if (params.agreementType) {
  data.agreement_type = params.agreementType
}

// Current date
data.current_date = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
```

---

### Fix 6: Package/Line Item Fields (COMPLEX - REQUIRES DESIGN DECISION)

The package and line item fields (`{{package_name}}`, `{{line_item_1}}`, etc.) require special handling because:

1. An event can have multiple packages/line items
2. The current template uses placeholder indices (`_1`, `_2`)

**Options:**

**Option A - Dynamic replacement:** Replace the template section pattern with a repeating block pattern that iterates over actual line items.

**Option B - Limit to first N items:** Map `line_item_1` to first line item, `line_item_2` to second, etc.

**Option C - Aggregate display:** Generate HTML/Markdown table of all line items and insert as `{{line_items_table}}`.

**Recommended: Option C** - Create a new merge field `{{line_items_table}}` that generates the entire pricing table dynamically:

```typescript
// In getMergeFieldData, after fetching invoices:
if (invoices && invoices.length > 0) {
  const lineItems = invoices[0].line_items || []
  let tableHtml = '| Item | Description | Price |\n|------|-------------|-------|\n'

  lineItems.forEach((item: any) => {
    const name = item.name || item.product_name || 'Item'
    const desc = item.description || ''
    const price = `$${(item.total || item.amount || 0).toFixed(2)}`
    tableHtml += `| ${name} | ${desc} | ${price} |\n`
  })

  data.line_items_table = tableHtml
}
```

---

### Fix 7: Update Rich Text Editor Merge Fields (LOW PRIORITY)

**File:** `src/components/ui/rich-text-editor.tsx`
**Lines:** 125-162

Add the missing location fields to MERGE_FIELDS array:

```typescript
// Add after Event fields:
{ label: 'Location: Name', value: '{{location_name}}' },
{ label: 'Location: Address', value: '{{location_address}}' },
{ label: 'Location: City', value: '{{location_city}}' },
{ label: 'Location: State', value: '{{location_state}}' },
{ label: 'Location: Zip', value: '{{location_zip}}' },
```

---

## Implementation Priority

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 1 | Fix setup_time source | High | Low |
| 2 | Add location fields | High | Low |
| 3 | Fix account address | High | Medium |
| 4 | Add alias mappings | Medium | Low |
| 5 | Add current_date | Medium | Low |
| 6 | Line items table | Low | High |
| 7 | Provider/tenant fields | Low | Medium |
| 8 | Update Rich Text Editor | Low | Low |

---

## Testing Recommendations

After implementing fixes:

1. **Create test event** with:
   - Account with billing/shipping addresses
   - Contact with address info
   - Event date with setup_time
   - Location with full address
   - Invoice with line items

2. **Test each merge field category:**
   - Generate contract from template section
   - Send email with merge fields
   - Send SMS with merge fields
   - Verify all `{{field}}` patterns are replaced

3. **Verify no orphan fields:** After replacement, search output for `{{` to find any unresolved merge fields.
