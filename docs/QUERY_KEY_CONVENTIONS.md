# React Query Key Conventions

## Overview

This document defines the standardized query key conventions used throughout the application to ensure consistency, prevent cache conflicts, and enable effective request deduplication.

## Why Standardize Query Keys?

1. **Prevents Typos**: Centralized definitions eliminate manual key typing
2. **Ensures Consistency**: All queries follow the same pattern
3. **Enables Deduplication**: React Query automatically deduplicates requests with identical keys
4. **Improves Maintainability**: Refactoring becomes easier when keys are centralized
5. **Provides Documentation**: The queryKeys file serves as a map of all queries

## Query Key Format

All query keys follow this standardized pattern:

```typescript
['<module>-<resource>', ...identifiers]
```

### Components:

- **module**: The module/domain (e.g., `event`, `account`, `contact`)
- **resource**: The specific resource type (e.g., `detail`, `staff`, `invoices`)
- **identifiers**: Additional parameters (e.g., `eventId`, `page`, filters)

### Examples:

```typescript
// List queries (plural, no identifier)
['events']                              // All events
['accounts']                            // All accounts

// Detail queries (singular entity with identifier)
['event-detail', eventId]               // Single event
['account-detail', accountId]           // Single account

// Related resource queries
['event-staff', eventId]                // Staff for an event
['event-invoices', eventId]             // Invoices for an event
['event-dates', eventId]                // Dates for an event

// Paginated queries
['event-communications', eventId, page] // Communications page N
['activities', page]                    // Activities page N

// Filtered queries
['event-task-status', eventIds]         // Task status for specific events
['events', { status: 'active' }]        // Filtered events list
```

## Using Centralized Query Keys

### Import and Use

All query keys are defined in `src/lib/queryKeys.ts`. Import and use them instead of hardcoding strings:

```typescript
// ❌ BAD: Hardcoded strings (prone to typos)
useQuery({
  queryKey: ['event', eventId],  // Inconsistent format!
  queryFn: () => fetchEvent(eventId)
})

// ✅ GOOD: Use centralized keys
import { queryKeys } from '@/lib/queryKeys'

useQuery({
  queryKey: queryKeys.events.detail(eventId),  // Generates: ['event-detail', eventId]
  queryFn: () => fetchEvent(eventId)
})
```

### Available Query Keys

#### Events Module

```typescript
import { queryKeys } from '@/lib/queryKeys'

// List
queryKeys.events.list()                         // ['events']

// Detail and related resources
queryKeys.events.detail(eventId)                // ['event-detail', eventId]
queryKeys.events.dates(eventId)                 // ['event-dates', eventId]
queryKeys.events.staff(eventId)                 // ['event-staff', eventId]
queryKeys.events.invoices(eventId)              // ['event-invoices', eventId]
queryKeys.events.logistics(eventId)             // ['event-logistics', eventId]
queryKeys.events.activities(eventId)            // ['event-activities', eventId]
queryKeys.events.attachments(eventId)           // ['event-attachments', eventId]

// Paginated
queryKeys.events.communications(eventId, page)  // ['event-communications', eventId, page]

// Status queries
queryKeys.events.taskStatus(eventIds)           // ['event-task-status', eventIds]

// Reference data
queryKeys.events.references.accounts()          // ['event-references', 'accounts']
queryKeys.events.references.contacts()          // ['event-references', 'contacts']
queryKeys.events.references.locations()         // ['event-references', 'locations']
```

## Request Deduplication

React Query automatically deduplicates requests with identical query keys. This means:

```typescript
// Component A
useQuery({ queryKey: queryKeys.events.detail('123'), ... })

// Component B (mounted simultaneously)
useQuery({ queryKey: queryKeys.events.detail('123'), ... })

// Result: Only ONE network request is made!
// Both components share the same cached data.
```

### Benefits:

- **Reduced Network Traffic**: Multiple components requesting the same data = single request
- **Faster Loading**: Components reuse existing cached data
- **Better UX**: No duplicate loading states

### Important: Pagination Must Be in Query Key

For pagination to work correctly, the page number MUST be part of the query key:

```typescript
// ✅ CORRECT: Page is in query key
useQuery({
  queryKey: queryKeys.events.communications(eventId, page),  // ['event-communications', eventId, page]
  queryFn: () => fetchCommunications(eventId, page)
})

// ❌ WRONG: Page not in query key
useQuery({
  queryKey: queryKeys.events.communications(eventId),  // ['event-communications', eventId]
  queryFn: () => fetchCommunications(eventId, page)  // Page changes won't trigger new requests!
})
```

## Cache Invalidation

### Invalidating Specific Queries

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

const queryClient = useQueryClient()

// Invalidate a specific event detail
queryClient.invalidateQueries({
  queryKey: queryKeys.events.detail(eventId)
})

// Invalidate all events (for list refresh)
queryClient.invalidateQueries({
  queryKey: queryKeys.events.list()
})

// Invalidate all queries starting with ['event-staff']
queryClient.invalidateQueries({
  queryKey: ['event-staff']  // Prefix match
})
```

### Using Invalidation Helpers

For common scenarios, use the provided invalidation helpers:

```typescript
import { invalidationHelpers } from '@/lib/queryKeys'

// Invalidate all event-related queries
invalidationHelpers.invalidateAllEvents().forEach(key => {
  queryClient.invalidateQueries({ queryKey: key })
})

// Invalidate a specific event and all its resources
invalidationHelpers.invalidateEvent(eventId).forEach(key => {
  queryClient.invalidateQueries({ queryKey: key })
})
```

## Common Patterns

### 1. List + Detail Pattern

```typescript
// List query
const { data: events } = useQuery({
  queryKey: queryKeys.events.list(),
  queryFn: fetchEvents
})

// Detail query (different key!)
const { data: event } = useQuery({
  queryKey: queryKeys.events.detail(eventId),
  queryFn: () => fetchEvent(eventId)
})

// After mutation, invalidate both
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.events.list() })
  queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
}
```

### 2. Dependent Queries

```typescript
// Parent query
const { data: event } = useQuery({
  queryKey: queryKeys.events.detail(eventId),
  queryFn: () => fetchEvent(eventId)
})

// Child query (depends on parent)
const { data: staff } = useQuery({
  queryKey: queryKeys.events.staff(eventId),
  queryFn: () => fetchStaff(eventId),
  enabled: Boolean(event)  // Only fetch when event exists
})
```

### 3. Optimistic Updates

```typescript
const updateEvent = useMutation({
  mutationFn: (data) => eventsService.update(eventId, data),
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({
      queryKey: queryKeys.events.detail(eventId)
    })

    // Snapshot previous value
    const previousEvent = queryClient.getQueryData(
      queryKeys.events.detail(eventId)
    )

    // Optimistically update
    queryClient.setQueryData(
      queryKeys.events.detail(eventId),
      (old) => ({ ...old, ...newData })
    )

    return { previousEvent }
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(
      queryKeys.events.detail(eventId),
      context.previousEvent
    )
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({
      queryKey: queryKeys.events.detail(eventId)
    })
  }
})
```

## Migration Guide

### Migrating Existing Hooks

If you have hooks with hardcoded query keys, follow this process:

1. **Import queryKeys**:
   ```typescript
   import { queryKeys } from '@/lib/queryKeys'
   ```

2. **Replace hardcoded strings**:
   ```typescript
   // Before
   queryKey: ['event', eventId]

   // After
   queryKey: queryKeys.events.detail(eventId)
   ```

3. **Update invalidation calls**:
   ```typescript
   // Before
   queryClient.invalidateQueries({ queryKey: ['event', eventId] })

   // After
   queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
   ```

4. **Test thoroughly**: Ensure cache invalidation and data fetching still work correctly

### Migration Checklist

For each hook file:

- [ ] Import queryKeys from `@/lib/queryKeys`
- [ ] Replace all hardcoded query key arrays
- [ ] Update invalidateQueries calls
- [ ] Update removeQueries calls (if any)
- [ ] Update setQueryData calls (if any)
- [ ] Test the hook in the UI
- [ ] Verify cache invalidation works
- [ ] Check React Query DevTools for correct keys

## Best Practices

### DO:

✅ Use centralized query keys from `queryKeys.ts`
✅ Include all identifying parameters in the query key
✅ Use consistent naming patterns (dash-separated)
✅ Include pagination parameters in the key
✅ Namespace reference data to avoid conflicts
✅ Use TypeScript types for type safety
✅ Document complex query keys with comments

### DON'T:

❌ Hardcode query key strings directly in hooks
❌ Use inconsistent naming (mixing camelCase and dash-case)
❌ Forget to include pagination parameters
❌ Use overly generic keys that might conflict ('data', 'items', etc.)
❌ Include non-serializable values in keys (functions, class instances)
❌ Change query keys without updating invalidation calls

## Debugging Query Keys

### React Query DevTools

The React Query DevTools show all active queries and their keys:

1. Open DevTools in browser
2. Click "React Query" tab
3. View all queries, their keys, and cache status
4. Verify keys match expected format

### Common Issues

**Issue**: Data not updating after mutation
**Solution**: Check that invalidateQueries uses the same key format

**Issue**: Multiple requests for same data
**Solution**: Verify query keys are identical (check for typos or missing parameters)

**Issue**: Cache not shared between components
**Solution**: Ensure both components use identical query keys (use centralized keys)

## Adding New Query Keys

When adding new queries:

1. Add the key to `src/lib/queryKeys.ts`
2. Follow the established naming pattern
3. Add TypeScript types if needed
4. Document complex keys with JSDoc comments
5. Add to migration notes if replacing an old key

Example:

```typescript
// In src/lib/queryKeys.ts
export const queryKeys = {
  events: {
    // ... existing keys

    /**
     * Equipment assigned to an event
     * @param eventId - Event UUID
     * @returns ['event-equipment', eventId]
     */
    equipment: (eventId: string) => ['event-equipment', eventId] as const,
  }
}
```

## Resources

- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)

## Questions?

If you have questions about query keys or need help with migration, please:

1. Check this document first
2. Review `src/lib/queryKeys.ts` for examples
3. Ask in #engineering Slack channel
4. Reference the React Query documentation
