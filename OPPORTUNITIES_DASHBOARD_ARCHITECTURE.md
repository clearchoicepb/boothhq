# 🏗️ OPPORTUNITIES DASHBOARD ARCHITECTURE
## Comprehensive Technical Analysis for Scalable Changes

**Date:** October 23, 2025  
**Purpose:** Guide implementation of KPI stats, pagination, and column structure changes  
**Status:** Complete architectural analysis

---

# PART 1: CURRENT ARCHITECTURE OVERVIEW

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OpportunitiesPage                         │
│                   (586 lines - orchestrator)                 │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├─► useOpportunitiesData (Server Data)
              │   ├─ Fetches: GET /api/entities/opportunities
              │   ├─ Params: page, limit, stage, owner_id
              │   ├─ Returns: { data: [], pagination: {...} }
              │   └─ State: opportunities[], totalItems, totalPages
              │
              ├─► useOpportunityFilters (Client Filtering)
              │   ├─ Input: opportunities[] from hook
              │   ├─ Filters: search, stage, owner, date
              │   └─ Output: filteredOpportunities[]
              │
              ├─► useOpportunityCalculations (Stats)
              │   ├─ Input: opportunities[] (current page only!)
              │   ├─ Calculates: Total vs Expected value
              │   └─ Output: currentStats { qty, amount }
              │
              ├─► useOpportunityDragAndDrop (Pipeline)
              │   ├─ Input: opportunities[]
              │   └─ Output: drag handlers, animations
              │
              └─► Display Components
                  ├─ OpportunityStatsCard (x3)
                  ├─ OpportunityTable (desktop)
                  ├─ OpportunityMobileCard (mobile)
                  └─ OpportunityPipelineView (kanban)
```

---

## 🎯 Critical Finding: Stats Use CURRENT PAGE DATA ONLY

**IMPORTANT:** The KPI stats cards calculate from `opportunities` array, which contains **ONLY the current page** (25 items).

**Code Evidence:**
```typescript
// src/app/[tenant]/opportunities/page.tsx line 64-83
const {
  opportunities,  // ← Only current page (25 items)
  setOpportunities,
  loading: localLoading,
  totalItems,   // ← Total count from API
  totalPages,
  currentPage,
  setCurrentPage,
  fetchOpportunities,
  handlePageChange,
  handleDeleteOpportunity,
} = useOpportunitiesData(...)

// line 130-135
const {
  calculationMode,
  setCalculationMode,
  currentStats,  // ← Calculated from opportunities[] (current page only!)
  openOpportunities,
} = useOpportunityCalculations(opportunities, settings)  // ← Only current page data!
```

**Result:**
- Stats show: "Total Opportunities: 25" (even if there are 100 total)
- Stats show: "Total Value: $50,000" (only sum of current page)
- Subtitle says: **"On current page"** (accurate but confusing to users)

---

# PART 2: CURRENT COLUMN STRUCTURE

## TABLE VIEW (OpportunityTable)

**Desktop Columns (9 columns):**
1. **Opportunity Name** (text-sm font-medium)
   - Field: `opportunity.name`
   - Truncates with max-w-xs

2. **Account** (text-sm)
   - Field: `opportunity.account_name`
   - Shows 'N/A' if null
   - Truncates max-w-32

3. **Contact** (text-sm)
   - Field: `opportunity.contact_name`
   - Shows 'N/A' if null
   - Truncates max-w-32

4. **Owner** (center-aligned, w-16)
   - Field: `opportunity.owner_id`
   - Display: Circle avatar with initials
   - Shows '?' if unassigned

5. **Stage** (text-xs font-semibold)
   - Field: `opportunity.stage`
   - Display: Colored badge (from settings)
   - Uses: `getStageColor()`, `getStageName()`

6. **Close Reason** (conditional - only if stage is closed_won/closed_lost)
   - Fields: `opportunity.close_reason`, `opportunity.close_notes`
   - Display: Colored badge + notes

7. **Prob** (text-sm, w-20)
   - Field: `opportunity.probability`
   - Display: `{value}%`
   - Calculated: `getOpportunityProbability(opportunity, settings)`

8. **Value** (text-sm, w-28)
   - Field: `opportunity.amount`
   - Display: `${value.toLocaleString()}`

9. **Close Date** (text-sm, w-32)
   - Field: `opportunity.expected_close_date`
   - Display: Short date + days until badge
   - Shows 'Not set' if null
   - Badge: Green if today, blue if upcoming (≤30 days)

10. **Actions** (w-20)
    - View icon (Eye)
    - Email icon (Mail)
    - SMS icon (MessageSquare)
    - Delete icon (Trash2)

---

## MOBILE VIEW (OpportunityMobileCard)

**Card Structure:**

**Header Section:**
- Opportunity name (font-semibold text-base)
- Account name (text-sm text-gray-600)
- Contact name (text-xs text-gray-500)
- Owner badge (10x10 circle, top-right)

**Details Grid (2 columns):**
1. Stage (colored badge)
2. Probability (percentage)
3. Value (dollar amount)
4. Weighted Value (probability * amount)

**Additional Fields:**
- Close Date (if set)
  - Shows date + days until badge
  - Green if today, blue if upcoming

**Actions Footer:**
- View Details button (link)
- Email icon button
- SMS icon button

---

## PIPELINE VIEW (OpportunityPipelineCard)

**Card Structure:**

**Visual Elements:**
- Owner badge (top-left, 6x6 circle)
- Drag handle indicator (top-right, appears on hover)

**Fields Displayed:**
1. Opportunity name (text-sm font-medium, truncated)
2. Account name (text-xs text-gray-600)
3. Value (text-xs font-medium text-green-600)
4. Probability (text-xs text-gray-500)

**Actions:**
- View (Eye icon)
- Edit (Edit icon)

**Missing from Pipeline View (compared to Table):**
- Contact name
- Close date
- Close reason
- Weighted value

---

# PART 3: API CONTRACT

## GET /api/entities/opportunities

**Endpoint:** `/api/entities/opportunities`

### Request Parameters:

```typescript
{
  stage: string          // 'all' | 'prospecting' | 'qualification' | etc.
  page: number           // Current page number (1-based)
  limit: number          // Items per page (default: 25)
  owner_id?: string      // Filter by owner (optional, 'all' = no filter)
  pipelineView?: 'true'  // Special handling for pipeline (optional)
  include_converted?: 'true'  // Include opportunities converted to events
}
```

**Current Values:**
- `page`: Dynamic (from currentPage state)
- `limit`: **Hardcoded 25** (line 56 in page.tsx: `itemsPerPage = 25`)
- `stage`: From filterStage state ('all' by default)
- `owner_id`: From filterOwner state (if not 'all')
- `pipelineView`: 'true' if currentView === 'pipeline'
- `include_converted`: Always 'true'

### Response Structure:

```typescript
{
  data: OpportunityWithRelations[],
  pagination: {
    page: number,
    limit: number,
    total: number,        // ← Total count across ALL pages
    totalPages: number,
    hasMore: boolean
  }
}
```

### OpportunityWithRelations Interface:

```typescript
interface OpportunityWithRelations {
  // Core fields from opportunities table
  id: string
  tenant_id: string
  name: string
  description: string | null
  amount: number | null
  stage: string
  probability: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  close_reason: string | null
  close_notes: string | null
  event_type: string | null
  date_type: string | null
  event_date: string | null
  initial_date: string | null
  final_date: string | null
  account_id: string | null
  contact_id: string | null
  lead_id: string | null
  owner_id: string | null
  is_converted: boolean | null
  converted_event_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
  
  // Computed/joined fields from API
  account_name: string | null      // From accounts table
  account_type: 'individual' | 'company' | null
  contact_name: string | null      // From contacts table
  owner_name?: string | null       // Not actually populated currently
}
```

**Total Fields Returned:** 27 fields per opportunity

---

# PART 4: HOOKS ARCHITECTURE

## useOpportunitiesData Hook

**Location:** `src/hooks/useOpportunitiesData.ts` (187 lines)

### Responsibility:
- Server-side data fetching
- Pagination management
- Auto-refresh on focus/visibility
- CRUD operations

### State Managed:

```typescript
{
  opportunities: OpportunityWithRelations[]  // Current page data (25 items)
  loading: boolean
  currentPage: number
  totalItems: number        // Total across all pages
  totalPages: number
  lastFetchTime: number     // For throttling refetches
}
```

### Functions Exposed:

```typescript
{
  opportunities,          // Current page data array
  setOpportunities,       // Update state
  loading,                // Loading indicator
  totalItems,             // Total count (all pages)
  totalPages,             // Number of pages
  currentPage,            // Current page number
  setCurrentPage,         // Page setter
  fetchOpportunities,     // Refetch function
  handlePageChange,       // Page change handler (scrolls to top)
  handleDeleteOpportunity // Delete with confirmation
}
```

### Auto-Refresh Logic:
- Refetches on window focus (3s throttle)
- Refetches on visibility change (3s throttle)
- Prevents excessive API calls

### Pagination:
- **Type:** Server-side
- **Default limit:** 25
- **Current limit:** Hardcoded, not user-configurable
- **Page state:** Managed in hook

---

## useOpportunityFilters Hook

**Location:** `src/hooks/useOpportunityFilters.ts` (189 lines)

### Responsibility:
- Client-side filtering AFTER fetching
- Search, stage, owner, date filters
- Filter state management

### State Managed:

```typescript
{
  searchTerm: string
  filterStage: string
  filterOwner: string
  dateFilter: string
  dateType: 'created' | 'closed'
}
```

### Logic:
- **Input:** opportunities[] (from useOpportunitiesData - current page only)
- **Processing:** Filters client-side by search/stage/date
- **Output:** filteredOpportunities[] (subset of current page)

**Note:** This is CLIENT-SIDE filtering of ALREADY-FILTERED server data!
- Server filters by: stage, owner_id
- Client filters by: search, date range
- This is why search doesn't reset pagination

---

## useOpportunityCalculations Hook

**Location:** `src/hooks/useOpportunityCalculations.ts` (79 lines)

### Responsibility:
- Calculate KPI statistics
- Total vs Expected value modes
- Open opportunity counts

### Input:
```typescript
opportunities: OpportunityWithRelations[]  // ← CURRENT PAGE ONLY (25 items)
settings: any  // For probability calculations
```

### Calculations:

**Total Mode:**
```typescript
calculateTotalOpportunities = {
  qty: opportunities.length,  // ← Count of current page
  amount: sum(opportunities.amount)  // ← Sum of current page
}
```

**Expected Mode:**
```typescript
calculateExpectedValue = {
  qty: openOpps.length,  // ← Open opportunities on current page
  amount: sum(getWeightedValue(opp))  // ← Weighted sum of current page
}

// getWeightedValue = opportunity.amount * (probability / 100)
```

**Open Opportunities Count:**
```typescript
openOpportunities = opportunities.filter(opp => 
  !['closed_won', 'closed_lost'].includes(opp.stage)
).length  // ← Count on current page only
```

### Output:

```typescript
{
  calculationMode: 'total' | 'expected',
  setCalculationMode: (mode) => void,
  currentStats: { qty: number, amount: number },
  openOpportunities: number
}
```

### 🚨 **CRITICAL LIMITATION:**
All calculations use **CURRENT PAGE DATA ONLY** (25 items max)

**Example:**
- User has 100 opportunities across 4 pages
- User is on page 1
- Stats show: "Total: 25, Value: $50,000"
- **Should show:** "Total: 100, Value: $200,000"

**Workaround Exists:** Subtitle says "On current page"
**User Experience:** Confusing and not useful for KPIs

---

## useOpportunityDragAndDrop Hook

**Location:** `src/hooks/useOpportunityDragAndDrop.ts` (155 lines)

### Responsibility:
- Drag-and-drop state
- Stage updates via API
- Success animations

### Not relevant for KPI/pagination changes

---

# PART 5: COMPONENT HIERARCHY

## OpportunitiesPage → Child Components

```
OpportunitiesPage (src/app/[tenant]/opportunities/page.tsx)
│
├─► AppLayout (page wrapper)
│
├─► OpportunityCalculationModeToggle
│   └─ Toggle between Total/Expected modes
│
├─► OpportunityStatsCard (x3)
│   ├─ Card 1: Total/Expected Opportunities (qty)
│   ├─ Card 2: Total/Expected Value (amount)
│   └─ Card 3: Open Opportunities (count)
│
├─► OpportunityFilters (if not pipeline view)
│   └─ Search, Stage, Owner, Date filters + Sort
│
├─► View Toggle Buttons
│   └─ Table / Pipeline switcher
│
├─► Conditional View Rendering:
│   │
│   ├─► TABLE VIEW:
│   │   ├─ OpportunityMobileCard[] (mobile, md:hidden)
│   │   └─ OpportunityTable (desktop, hidden md:block)
│   │       └─ Pagination component
│   │
│   └─► PIPELINE VIEW:
│       ├─ OpportunityPipelineView
│       │   └─ OpportunityPipelineCard[]
│       ├─ ClosedOpportunitiesBucket (Won)
│       ├─ ClosedOpportunitiesBucket (Lost)
│       └─ ClosedOpportunitiesPopup
│
└─► Modals:
    ├─ SendEmailModal
    ├─ SendSMSModal
    ├─ CloseOpportunityModal
    └─ OpportunitySourceSelector
```

---

# PART 6: KPI STATS CARDS - CURRENT IMPLEMENTATION

## Location & Usage

**Component:** `src/components/opportunities/opportunity-stats-card.tsx` (47 lines)

**Usage in page.tsx (lines 259-284):**

```typescript
<OpportunityStatsCard
  icon={<DollarSign className="h-8 w-8 text-[#347dc4]" />}
  title={calculationMode === 'total' ? 'Total Opportunities' : 'Expected Opportunities'}
  value={currentStats.qty}
  subtitle="On current page"  // ← Hardcoded subtitle
/>

<OpportunityStatsCard
  icon={<DollarSign className="h-8 w-8 text-[#347dc4]" />}
  title={calculationMode === 'total' ? 'Total Value' : 'Expected Value'}
  value={`$${Math.round(currentStats.amount).toLocaleString()}`}
  subtitle="On current page"  // ← Hardcoded subtitle
/>

<OpportunityStatsCard
  icon={<DollarSign className="h-8 w-8 text-[#347dc4]" />}
  title="Open Opportunities"
  value={openOpportunities}
  subtitle={
    calculationMode === 'expected'
      ? `Based on probability-weighted values${settings.opportunities?.autoCalculateProbability ? ' (stage-based)' : ' (individual)'}`
      : 'On current page'  // ← Hardcoded subtitle
  }
/>
```

## Data Source

**Current:** `useOpportunityCalculations(opportunities, settings)`

**Input:** `opportunities` array from `useOpportunitiesData`
- Contains: **Current page only** (25 items)
- Does NOT contain: All opportunities

**Calculation:**
```typescript
// Total Mode (line 33-36 in useOpportunityCalculations.ts)
const calculateTotalOpportunities = useMemo(() => {
  const totalQty = opportunities.length  // ← Only 25 max
  const totalAmount = opportunities.reduce((sum, opp) => 
    sum + (opp.amount || 0), 0)  // ← Sum of 25 items
  return { qty: totalQty, amount: totalAmount }
}, [opportunities])

// Expected Mode (line 40-50)
const calculateExpectedValue = useMemo(() => {
  const openOpps = opportunities.filter((opp) => 
    !['closed_won', 'closed_lost'].includes(opp.stage)
  )  // ← Filters current page only

  const expectedValue = openOpps.reduce((sum, opp) => {
    return sum + getWeightedValue(opp, settings.opportunities)
  }, 0)  // ← Weighted sum of current page

  return { qty: openOpps.length, amount: expectedValue }
}, [opportunities, settings.opportunities])
```

**Result:** Stats are **MISLEADING** - only show current page data

---

# PART 7: PAGINATION - CURRENT IMPLEMENTATION

## Pagination Type: **SERVER-SIDE**

**Evidence:**
```typescript
// API call (line 80 in useOpportunitiesData.ts)
const response = await fetch(`/api/entities/opportunities?${params.toString()}`)

// Params include:
params = {
  stage: filterStage,
  page: currentPage.toString(),  // ← Server-side page number
  limit: itemsPerPage.toString()  // ← Server-side limit
}

// Response includes:
{
  data: [...],  // ← Only current page data
  pagination: {
    page, limit, total, totalPages, hasMore
  }
}
```

## Current Limit: **25 (Hardcoded)**

**Location:** `src/app/[tenant]/opportunities/page.tsx` line 56
```typescript
const itemsPerPage = 25  // ← Hardcoded constant
```

**Not User-Configurable:**
- No dropdown to change limit
- No preference storage
- Fixed at 25 across all views

## Pagination State Management

**State:**
```typescript
const [currentPage, setCurrentPage] = useState(1)
```

**Managed by:** `useOpportunitiesData` hook

**Change Handler:**
```typescript
const handlePageChange = useCallback((page: number) => {
  setCurrentPage(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })  // ← Scrolls to top
}, [])
```

**Effect:** When page changes, `useOpportunitiesData` refetches with new page number

## Pagination Component

**Location:** `src/components/ui/pagination.tsx` (150 lines)

**Features:**
- Shows "Showing X to Y of Z results"
- Previous/Next buttons
- Page number buttons (shows 5 max with ellipsis)
- Mobile-friendly (shows "Page X of Y" on mobile)
- Disabled state during loading

**Props:**
```typescript
{
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  loading?: boolean
}
```

---

# PART 8: RECOMMENDATIONS FOR REQUESTED CHANGES

## 🎯 CHANGE 1: KPI Stats Showing ALL Data (Not Just Current Page)

### Current Problem:
- Stats cards show current page data only (max 25 items)
- Misleading to users expecting total system stats
- Subtitle "On current page" acknowledges issue

### Solution Options:

#### **OPTION A: Separate API Endpoint for Stats** ⭐ **RECOMMENDED**

**Create:** `GET /api/opportunities/stats`

**Returns:**
```typescript
{
  totalOpportunities: number,
  totalValue: number,
  openOpportunities: number,
  expectedValue: number,
  byStage: {
    prospecting: { count: number, value: number },
    qualification: { count: number, value: number },
    ...
  }
}
```

**Pros:**
- ✅ Single lightweight API call
- ✅ Backend calculates efficiently with SQL aggregations
- ✅ No need to fetch all opportunities
- ✅ Fast (database aggregation > JavaScript loops)
- ✅ Can add more stats easily

**Cons:**
- ⚠️ Requires new API endpoint (30 mins work)
- ⚠️ Two separate API calls (one for list, one for stats)

**Implementation:**
1. Create `/api/opportunities/stats` endpoint
2. Use SQL aggregation:
```sql
SELECT 
  COUNT(*) as total_opportunities,
  SUM(amount) as total_value,
  COUNT(CASE WHEN stage NOT IN ('closed_won', 'closed_lost') THEN 1 END) as open_count,
  SUM(CASE WHEN stage NOT IN ('closed_won', 'closed_lost') 
      THEN amount * (probability / 100.0) END) as expected_value
FROM opportunities
WHERE tenant_id = $1
```
3. Create `useOpportunityStats()` hook
4. Replace `useOpportunityCalculations` with new hook
5. Update stats cards to use new data

**Time:** 1-2 hours

---

#### **OPTION B: Fetch All Opportunities for Stats**

**Approach:** Make a second API call to fetch all opportunities (no pagination)

**Pros:**
- ✅ Uses existing endpoint
- ✅ No new backend code needed

**Cons:**
- ❌ Fetches ALL opportunities (could be 1000+)
- ❌ Slow with large datasets
- ❌ High memory usage
- ❌ Inefficient data transfer
- ❌ Doesn't scale

**NOT RECOMMENDED** for production

---

#### **OPTION C: Backend Aggregation in Current Endpoint**

**Approach:** Include stats in the existing paginated response

**Response:**
```typescript
{
  data: [...],  // Current page
  pagination: {...},
  stats: {  // ← Add this
    total_opportunities: number,
    total_value: number,
    ...
  }
}
```

**Pros:**
- ✅ Single API call
- ✅ Stats included automatically
- ✅ Backend aggregation (fast)

**Cons:**
- ⚠️ Stats recalculated on every page change (inefficient)
- ⚠️ Could cache but adds complexity

**Verdict:** OPTION A is better (separate stats endpoint with caching)

---

### **RECOMMENDED: OPTION A**

**Why:**
1. **Scalable:** Works with 10 or 10,000 opportunities
2. **Fast:** SQL aggregation is extremely efficient
3. **Cacheable:** Stats can be cached (60s TTL)
4. **Flexible:** Easy to add more stats later
5. **Industry Standard:** Dashboard stats are separate from list data

**Implementation Plan:**

1. **Create API Endpoint** (30 mins)
```typescript
// src/app/api/opportunities/stats/route.ts
export async function GET(request: NextRequest) {
  // SQL aggregation query
  // Return stats object
  // Add caching headers
}
```

2. **Create Stats Hook** (15 mins)
```typescript
// src/hooks/useOpportunityStats.ts
export function useOpportunityStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/opportunities/stats')
      .then(res => res.json())
      .then(setStats)
  }, [])
  
  return { stats, loading, refetch }
}
```

3. **Update Page** (15 mins)
```typescript
// Replace useOpportunityCalculations with useOpportunityStats
const { stats, loading: statsLoading } = useOpportunityStats()

// Update stats cards to use stats.total_value, stats.total_opportunities, etc.
```

**Total Time:** 1-2 hours  
**Difficulty:** Easy  
**Risk:** Low (additive change, no breaking changes)

---

## 🎯 CHANGE 2: Pagination Changes (25→50, Add Dropdown)

### Current Implementation:
- `itemsPerPage = 25` (hardcoded line 56)
- No user preference storage
- No dropdown to change limit

### Recommended Approach:

#### **1. Add Items Per Page Selector**

**Location:** Next to pagination controls

**UI:**
```typescript
<Select value={itemsPerPage} onChange={setItemsPerPage}>
  <option value="10">10 per page</option>
  <option value="25">25 per page</option>
  <option value="50">50 per page</option>
  <option value="100">100 per page</option>
</Select>
```

#### **2. Store Preference in Settings**

**Use existing pattern:**
```typescript
// Save to settings (like view preference)
await updateSettings({
  ...settings,
  opportunities: {
    ...settings.opportunities,
    itemsPerPage: 50  // ← Save user preference
  }
})
```

#### **3. Update Hook to Accept Dynamic Limit**

**Current:**
```typescript
const itemsPerPage = 25  // ← Hardcoded
```

**New:**
```typescript
const [itemsPerPage, setItemsPerPage] = useState(
  settings.opportunities?.itemsPerPage || 25  // ← From settings
)

// Pass to hook
useOpportunitiesData({ ..., itemsPerPage })
```

#### **4. Component Changes Needed:**

**Files to Update:**
1. `src/app/[tenant]/opportunities/page.tsx`
   - Change `itemsPerPage` from const to state
   - Add dropdown selector
   - Add handler to save preference

2. `src/hooks/useOpportunitiesData.ts`
   - Already accepts `itemsPerPage` prop ✅
   - No changes needed!

3. `src/components/ui/pagination.tsx`
   - Already displays correct counts ✅
   - No changes needed!

4. `src/components/opportunities/opportunity-table.tsx`
   - Already receives `itemsPerPage` prop ✅
   - No changes needed!

**Total Files to Change:** 1 file (just the page.tsx)

**Time:** 30 minutes  
**Difficulty:** Easy  
**Risk:** Very low

---

## 🎯 CHANGE 3: Column Structure Management

### Current Implementation:

**Decentralized:** Each component defines its own columns/fields

**OpportunityTable:**
- Hardcoded 9 columns in JSX
- Column headers inline
- No configuration object

**OpportunityMobileCard:**
- Different fields than table
- Hardcoded in JSX

**OpportunityPipelineCard:**
- Minimal fields
- Hardcoded in JSX

### Recommendations:

#### **OPTION A: Centralized Column Config** ⭐ **RECOMMENDED**

**Create:** `src/config/opportunity-columns.ts`

```typescript
export interface ColumnDef {
  id: string
  label: string
  field: string | ((opp: OpportunityWithRelations) => any)
  width?: string
  sortable?: boolean
  filterable?: boolean
  hiddenOnMobile?: boolean
  format?: (value: any) => string
}

export const opportunityColumns: ColumnDef[] = [
  {
    id: 'name',
    label: 'Opportunity Name',
    field: 'name',
    width: 'min-w-[200px]',
    sortable: true,
    filterable: true
  },
  {
    id: 'account',
    label: 'Account',
    field: 'account_name',
    width: 'w-32',
    sortable: true,
    filterable: true
  },
  {
    id: 'contact',
    label: 'Contact',
    field: 'contact_name',
    width: 'w-32',
    sortable: true,
    hiddenOnMobile: true
  },
  {
    id: 'owner',
    label: 'Owner',
    field: (opp) => getOwnerInitials(opp.owner_id),
    width: 'w-16',
    sortable: true
  },
  {
    id: 'stage',
    label: 'Stage',
    field: 'stage',
    width: 'w-24',
    sortable: true,
    filterable: true,
    format: (value) => getStageName(value, settings)
  },
  {
    id: 'probability',
    label: 'Prob',
    field: (opp) => getOpportunityProbability(opp, settings),
    width: 'w-20',
    sortable: true,
    format: (value) => `${value}%`
  },
  {
    id: 'amount',
    label: 'Value',
    field: 'amount',
    width: 'w-28',
    sortable: true,
    format: (value) => `$${value?.toLocaleString() || '0'}`
  },
  {
    id: 'expected_close_date',
    label: 'Close Date',
    field: 'expected_close_date',
    width: 'w-32',
    sortable: true,
    format: (value) => formatDateShort(value)
  }
]

// Views can select which columns to show
export const tableViewColumns = opportunityColumns
export const mobileViewColumns = opportunityColumns.filter(c => !c.hiddenOnMobile)
export const pipelineViewColumns = opportunityColumns.filter(c => 
  ['name', 'account', 'amount', 'probability'].includes(c.id)
)
```

**Pros:**
- ✅ Single source of truth
- ✅ Easy to add/remove columns
- ✅ Consistent across views
- ✅ Reusable field formatters
- ✅ Easy column customization later

**Cons:**
- ⚠️ Initial refactor needed (2-3 hours)
- ⚠️ More abstraction (slight learning curve)

**Time:** 2-3 hours  
**Difficulty:** Medium  
**Risk:** Low (can do incrementally)

---

#### **OPTION B: Keep Per-Component Columns**

**Status Quo:** Each component manages its own display

**Pros:**
- ✅ No refactor needed
- ✅ Component flexibility

**Cons:**
- ❌ Duplication across components
- ❌ Inconsistencies possible
- ❌ Harder to maintain
- ❌ Column changes require updating multiple files

**Verdict:** NOT RECOMMENDED for long-term

---

### **RECOMMENDED: Start with OPTION A (Incremental)**

**Phase 1: Define Column Config** (30 mins)
- Create column definitions file
- Document all fields

**Phase 2: Update OpportunityTable** (1 hour)
- Use column config
- Keep same display
- Test thoroughly

**Phase 3: Update Mobile/Pipeline** (1 hour)
- Reuse column config
- Consistent field display

**Total Time:** 2-3 hours  
**Can be done incrementally** (one view at a time)

---

# RECOMMENDATIONS SUMMARY

## For KPI Stats (Show ALL Data):

### ⭐ **RECOMMENDED: OPTION A - Separate Stats API**

**Why:**
- Scalable (works with any dataset size)
- Fast (SQL aggregation)
- Cacheable (60s TTL)
- Industry standard pattern

**Implementation:**
1. Create `GET /api/opportunities/stats` endpoint
2. Use SQL SUM/COUNT aggregations
3. Create `useOpportunityStats()` hook
4. Replace calculations hook with stats hook
5. Update stats cards to use new data

**Time:** 1-2 hours  
**Impact:** HIGH - Makes KPIs actually useful  
**Risk:** LOW - Additive change

**SQL Example:**
```sql
SELECT 
  COUNT(*) as total_count,
  SUM(amount) as total_value,
  COUNT(CASE WHEN stage NOT IN ('closed_won', 'closed_lost') THEN 1 END) as open_count,
  SUM(CASE WHEN stage NOT IN ('closed_won', 'closed_lost') 
      THEN amount * (COALESCE(probability, 0) / 100.0) END) as expected_value,
  SUM(CASE WHEN stage = 'closed_won' THEN amount ELSE 0 END) as won_value,
  COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_count
FROM opportunities
WHERE tenant_id = $1
  AND (stage = $2 OR $2 = 'all')
  AND (owner_id = $3 OR $3 IS NULL)
```

---

## For Pagination Changes (25→50, Dropdown):

### ⭐ **RECOMMENDED: Add Items Per Page Dropdown**

**Implementation:**

**Step 1: Add State** (5 mins)
```typescript
const [itemsPerPage, setItemsPerPage] = useState(
  settings.opportunities?.itemsPerPage || 25
)
```

**Step 2: Add Dropdown UI** (10 mins)
```typescript
<Select 
  value={itemsPerPage} 
  onChange={async (value) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)  // Reset to page 1
    
    // Save preference
    await updateSettings({
      ...settings,
      opportunities: {
        ...settings.opportunities,
        itemsPerPage: Number(value)
      }
    })
  }}
>
  <option value="10">10 per page</option>
  <option value="25">25 per page</option>
  <option value="50">50 per page</option>
  <option value="100">100 per page</option>
</Select>
```

**Step 3: Position UI** (5 mins)
- Place next to view toggle buttons
- OR place next to pagination component
- OR both locations

**Total Time:** 20-30 minutes  
**Files to Change:** 1 (`src/app/[tenant]/opportunities/page.tsx`)  
**Risk:** Very low (hooks already support dynamic itemsPerPage)

---

## For Column Structure:

### ⭐ **RECOMMENDED: Incremental Centralization**

**Phase 1: Document Current Columns** (done! ✅)

**Phase 2: Create Column Config** (30 mins)
- Define all fields
- Specify which views show which fields
- Add formatters

**Phase 3: Refactor Table View** (1 hour)
- Use column config
- Loop through columns instead of hardcoded
- Test thoroughly

**Phase 4: Refactor Mobile/Pipeline** (1 hour)
- Reuse column config
- Consistent display

**Total Time:** 2-3 hours  
**Can defer:** Not blocking KPI or pagination changes  
**Priority:** Medium (nice-to-have, not critical)

---

# IMPLEMENTATION PRIORITY

## Phase 1: Quick Wins (1 hour)

1. ✅ **Pagination Dropdown** (30 mins)
   - Add items per page selector
   - Save to settings
   - Test with 10/25/50/100

2. ✅ **Default to 50 Items** (5 mins)
   - Change default from 25 to 50
   - Better user experience
   - Still performant

## Phase 2: Critical Improvement (1-2 hours)

3. ✅ **KPI Stats API** (1-2 hours)
   - Create stats endpoint
   - SQL aggregations
   - useOpportunityStats hook
   - Update stats cards
   - **HIGH IMPACT** - Makes dashboard actually useful

## Phase 3: Optional Enhancement (2-3 hours)

4. ⏸️ **Column Centralization** (defer)
   - Create column config
   - Refactor components
   - Add column customization (future)

---

# CURRENT STATE SUMMARY

## What Works Well:
- ✅ Clean hook-based architecture
- ✅ Server-side pagination (scalable)
- ✅ Reusable components
- ✅ Responsive design
- ✅ Multiple view modes
- ✅ Good performance

## What Needs Improvement:
- ⚠️ KPI stats only show current page (misleading)
- ⚠️ No items-per-page selector
- ⚠️ Hardcoded 25 items limit
- ⚠️ Columns not centralized (minor)

## System Health:
- **Code Quality:** Excellent (recently refactored)
- **Architecture:** Solid (hooks pattern)
- **Performance:** Good (server pagination)
- **Scalability:** Good (will be excellent after stats API)

---

# TECHNICAL SPECIFICATIONS

## Current Data Flow:

```
1. User loads /opportunities page
   ↓
2. useOpportunitiesData hook fires
   ↓
3. GET /api/entities/opportunities?page=1&limit=25&stage=all
   ↓
4. API returns: { data: [25 items], pagination: { total: 100 } }
   ↓
5. Hook sets: opportunities = [25 items], totalItems = 100
   ↓
6. useOpportunityFilters applies client-side filters
   ↓
7. filteredOpportunities passed to display components
   ↓
8. useOpportunityCalculations calculates stats
   ↓
9. Stats shown: "Total: 25" (only current page!)
```

## Proposed Data Flow (After Stats API):

```
1. User loads /opportunities page
   ↓
2. TWO parallel API calls:
   │
   ├─► GET /api/entities/opportunities?page=1&limit=50
   │   └─ Returns: Current page data
   │
   └─► GET /api/opportunities/stats
       └─ Returns: Aggregated stats for ALL opportunities
   ↓
3. Stats cards show REAL totals
4. Table shows current page
5. Both update independently
```

---

# ACTION PLAN

## Immediate (This Session):

**Can implement right now if desired:**

1. **Change default to 50 items** (2 mins)
   ```typescript
   const itemsPerPage = 50  // Change from 25
   ```

2. **Add items per page dropdown** (30 mins)
   - State management
   - UI component
   - Settings integration

## Next Session:

3. **Create stats API endpoint** (1-2 hours)
   - SQL aggregations
   - Caching
   - Documentation

4. **Update stats display** (30 mins)
   - New hook
   - Update cards
   - Remove "On current page" subtitle

## Future (Optional):

5. **Column centralization** (2-3 hours)
   - Create config
   - Refactor components
   - Add customization UI

---

# FILES REFERENCE

## Key Files for Changes:

**For Pagination:**
- `src/app/[tenant]/opportunities/page.tsx` (main page - line 56)
- `src/hooks/useOpportunitiesData.ts` (already supports dynamic limit)
- `src/components/ui/pagination.tsx` (already handles display)

**For KPI Stats:**
- `src/app/api/opportunities/stats/route.ts` (NEW - create this)
- `src/hooks/useOpportunityStats.ts` (NEW - create this)
- `src/hooks/useOpportunityCalculations.ts` (REPLACE with stats hook)
- `src/app/[tenant]/opportunities/page.tsx` (update to use new hook)

**For Column Config:**
- `src/config/opportunity-columns.ts` (NEW - create this)
- `src/components/opportunities/opportunity-table.tsx` (refactor to use config)
- `src/components/opportunities/opportunity-mobile-card.tsx` (refactor)
- `src/components/opportunities/opportunity-pipeline-card.tsx` (refactor)

---

# CONCLUSION

The opportunities dashboard has **excellent architecture** that was recently refactored. The hooks pattern makes it **easy to modify**.

**Quick Wins Available:**
1. Pagination dropdown (30 mins)
2. Default to 50 items (2 mins)

**High-Impact Change:**
3. Stats API (1-2 hours) - Makes KPIs actually useful

**Current Limitation:**
- KPI stats show current page only
- Very misleading to users
- Easy to fix with stats API endpoint

**Recommendation:**
- ✅ Implement pagination dropdown NOW (30 mins)
- ✅ Create stats API NEXT (1-2 hours)
- ⏸️ Defer column centralization (nice-to-have)

---

**Ready to implement? I can start with the quick pagination fix right now if you want!** 🚀

---

*End of Architecture Report*

