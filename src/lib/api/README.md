# API Service Layer

This directory contains the centralized API client and service layer for the application.

## Structure

```
src/lib/api/
├── apiClient.ts          # Enhanced HTTP client with retry logic
├── queryClient.ts        # React Query configuration
├── QueryProvider.tsx     # React Query provider component
├── services/
│   ├── opportunitiesService.ts   # Opportunities API methods
│   ├── eventsService.ts          # Events API methods
│   ├── contactsService.ts        # Contacts API methods
│   ├── accountsService.ts        # Accounts API methods
│   └── index.ts                  # Services export
└── index.ts              # Main export file
```

## Features

### API Client
- **Automatic retry** with exponential backoff (3 attempts)
- **Request timeout** (30 seconds default)
- **Error handling** with custom ApiError class
- **TypeScript type safety**

### Services
- **Type-safe methods** for all CRUD operations
- **Consistent interface** across all services
- **Easy to mock** for testing
- **Centralized** - no more scattered fetch() calls

## Usage

### Basic Service Usage

```typescript
import { opportunitiesService } from '@/lib/api'

// List opportunities
const { data, total } = await opportunitiesService.list({
  stage: 'prospecting',
  page: 1,
  limit: 25
})

// Get single opportunity
const opportunity = await opportunitiesService.getById('123')

// Create opportunity
const newOpportunity = await opportunitiesService.create({
  name: 'New Deal',
  amount: 5000,
  stage: 'prospecting'
})

// Update opportunity
const updated = await opportunitiesService.update('123', {
  stage: 'qualification'
})

// Delete opportunity
await opportunitiesService.delete('123')
```

### Using with React Query

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opportunitiesService } from '@/lib/api'

function OpportunitiesList() {
  const queryClient = useQueryClient()

  // Fetch opportunities with caching
  const { data, isLoading, error } = useQuery({
    queryKey: ['opportunities', { stage: 'all' }],
    queryFn: () => opportunitiesService.list({ stage: 'all' })
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: opportunitiesService.create,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => opportunitiesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data?.data.map(opp => (
        <div key={opp.id}>{opp.name}</div>
      ))}

      <button onClick={() => createMutation.mutate({
        name: 'New Opportunity',
        amount: 1000
      })}>
        Create Opportunity
      </button>
    </div>
  )
}
```

### All Available Services

#### OpportunitiesService
```typescript
opportunitiesService.list(options)
opportunitiesService.getById(id)
opportunitiesService.create(data)
opportunitiesService.update(id, data)
opportunitiesService.delete(id)
opportunitiesService.getStats(filters)
opportunitiesService.convertToEvent(id, payload)
opportunitiesService.clone(id)
opportunitiesService.getActivity(id)
opportunitiesService.getTasksStatus(ids)
opportunitiesService.getCountByStage()
```

#### EventsService
```typescript
eventsService.list(options)
eventsService.getById(id)
eventsService.create(data)
eventsService.update(id, data)
eventsService.delete(id)
eventsService.getStats()
eventsService.clone(id)
eventsService.getActivity(id)
eventsService.getTasksStatus(ids)
eventsService.getDesignItems(eventId)
eventsService.createDesignItem(eventId, data)
eventsService.updateDesignItem(eventId, itemId, data)
eventsService.deleteDesignItem(eventId, itemId)
eventsService.getLogistics(eventId)
eventsService.updateLogistics(eventId, data)
eventsService.generateInvoice(eventId, data)
```

#### ContactsService
```typescript
contactsService.list(options)
contactsService.getById(id)
contactsService.search(query, options)
contactsService.create(data)
contactsService.update(id, data)
contactsService.delete(id)
contactsService.getActivity(id)
contactsService.getByEmail(email)
```

#### AccountsService
```typescript
accountsService.list(options)
accountsService.getById(id)
accountsService.search(query, options)
accountsService.create(data)
accountsService.update(id, data)
accountsService.delete(id)
accountsService.getActivity(id)
accountsService.getContacts(id)
accountsService.getOpportunities(id)
accountsService.getEvents(id)
```

## Error Handling

The API client throws `ApiError` instances:

```typescript
import { ApiError } from '@/lib/api'

try {
  await opportunitiesService.getById('invalid-id')
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.status)       // HTTP status code
    console.log('Message:', error.message)     // Error message
    console.log('Data:', error.data)           // Additional error data
  }
}
```

## React Query Configuration

The QueryClient is configured with:
- **Stale time**: 30 seconds
- **Cache time**: 5 minutes
- **Retry**: 3 times with exponential backoff
- **Refetch on window focus**: Enabled
- **Refetch on reconnect**: Enabled

## Next Steps

To migrate existing code to use services:

1. **Replace direct fetch() calls**:
   ```typescript
   // Before
   const response = await fetch('/api/opportunities')
   const data = await response.json()

   // After
   const data = await opportunitiesService.list()
   ```

2. **Use React Query for caching**:
   ```typescript
   // Before
   const [data, setData] = useState([])
   useEffect(() => {
     fetch('/api/opportunities')
       .then(r => r.json())
       .then(setData)
   }, [])

   // After
   const { data } = useQuery({
     queryKey: ['opportunities'],
     queryFn: () => opportunitiesService.list()
   })
   ```

3. **Handle mutations with React Query**:
   ```typescript
   const mutation = useMutation({
     mutationFn: opportunitiesService.create,
     onSuccess: () => {
       queryClient.invalidateQueries(['opportunities'])
     }
   })
   ```

## Benefits

✅ **Centralized** - All API calls in one place
✅ **Type-safe** - Full TypeScript support
✅ **Testable** - Easy to mock services
✅ **Resilient** - Automatic retry on failure
✅ **Cached** - React Query handles caching
✅ **Maintainable** - Changes in one place
✅ **DRY** - No duplicate fetch() logic
