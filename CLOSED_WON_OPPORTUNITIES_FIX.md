# Fix: Closed Won Opportunities Not Showing in Pipeline View

## Problem
Closed Won opportunities with `is_converted = true` were not showing in the opportunities dashboard because the API was filtering them out automatically.

## Root Cause
The `transformResponse` function in `/src/lib/api-entities.ts` was filtering out all opportunities where `is_converted = true`, which meant converted opportunities (those that became events) were completely hidden from the opportunities list.

## Solution (Option 3: Conditional Filtering)
Implemented a query parameter `include_converted` that allows the frontend to control whether converted opportunities should be included in the results.

## Changes Made

### 1. Updated EntityConfig Interface
**File:** `/src/lib/api-entities.ts`
- Modified `transformResponse` signature to accept optional `searchParams` parameter
```typescript
transformResponse?: (data: any, searchParams?: URLSearchParams) => any
```

### 2. Updated Opportunities Transform Logic
**File:** `/src/lib/api-entities.ts` (opportunities config)
- Changed the filter logic to check for `include_converted` query parameter
- If `include_converted=true`, all opportunities are returned (including converted ones)
- If not set or false, converted opportunities are filtered out (default behavior)

```typescript
transformResponse: (data, searchParams) => {
  const includeConverted = searchParams?.get('include_converted') === 'true'
  const filteredData = includeConverted 
    ? data 
    : data.filter((opportunity: any) => !opportunity.is_converted)
  // ... rest of transformation
}
```

### 3. Updated API Route
**File:** `/src/app/api/entities/[entity]/route.ts`
- Pass `searchParams` to `transformResponse` function
```typescript
const transformedData = config.transformResponse ?
  config.transformResponse(data, searchParams) : data
```

### 4. Updated Frontend Fetch Calls
Added `include_converted=true` parameter to opportunities API calls in:

- **`/src/app/[tenant]/opportunities/page.tsx`** - Main opportunities dashboard
- **`/src/components/dashboard-stats.tsx`** - Dashboard statistics
- **`/src/components/dashboard/stats-dashboard.tsx`** - Stats dashboard component

## How It Works

### Default Behavior (Backward Compatible)
Without the `include_converted` parameter, the API behaves as before - filtering out converted opportunities:
```
GET /api/entities/opportunities
// Returns only opportunities where is_converted = false
```

### New Behavior (Include Converted)
With the parameter, converted opportunities are included:
```
GET /api/entities/opportunities?include_converted=true
// Returns ALL opportunities, including those with is_converted = true
```

## Benefits

1. **Backward Compatible**: Existing API calls without the parameter continue to work as before
2. **Flexible**: Frontend can control whether to show converted opportunities
3. **Maintainable**: Centralized logic in one place (api-entities.ts)
4. **Consistent**: All dashboards now show converted opportunities, providing accurate counts

## Testing

To verify the fix works:

1. Navigate to the opportunities dashboard in pipeline view
2. You should now see the closed_won opportunity (Suevone Kinney - Wedding) in the "Closed Won" bucket
3. The count should show "1" instead of "0"
4. The opportunity should be draggable and interactable like other opportunities

## Alternative Approaches Considered

- **Option 1**: Set `is_converted = false` in database (Quick fix but loses data)
- **Option 2**: Remove the filter entirely (Could cause confusion with already-converted opportunities)
- **Option 3**: Make it conditional via query parameter (IMPLEMENTED - Most flexible)

## Database State

The opportunity in question:
```
ID: 51f0b56a-38a4-4d08-a36e-efaad870ed22
Name: Suevone Kinney - Wedding
Stage: closed_won
is_converted: true
actual_close_date: 2025-10-15
```

No database changes were required for this fix.

