# Detail Pages Audit: Events vs Opportunities

**Date**: 2025-11-01
**Branch**: `claude/events-continued-work-011CUhbY2uGfM81qCcEjGavQ`

## 📊 Executive Summary

The **Opportunities Detail Page** has **CRITICAL SOLID violations** and is inconsistent with the modern, well-structured **Events Detail Page**.

| Metric | Events Detail | Opportunities Detail | Status |
|--------|--------------|---------------------|---------|
| Lines of Code | 1,086 | 1,271 | ⚠️ Both large |
| Custom Hooks | 6+ hooks | 3 hooks | ❌ Opp insufficient |
| Service Layer | ✅ `eventsService` | ❌ Direct `fetch()` | ❌ Opp missing |
| Context Pattern | ✅ `EventDetailContext` | ❌ None | ❌ Opp missing |
| State Variables | ~8-10 (distributed in hooks) | **20+ in component** | ❌ Opp violation |
| Component Breakdown | ✅ 20+ sub-components | ⚠️ Tab components only | ⚠️ Opp needs more |
| SOLID Compliance | ✅ Good | ❌ Poor | ❌ Critical |

---

## 🔴 CRITICAL: Opportunities Detail Page Violations

### 1. **Single Responsibility Principle (SRP) - VIOLATED**

**The Problem**: The component does **EVERYTHING**:
- ❌ Data fetching (multiple useEffect hooks with fetch calls)
- ❌ State management (20+ useState hooks!)
- ❌ Business logic (stage changes, conversions, owner updates)
- ❌ API calls directly in component
- ❌ Modal management for 8+ different modals
- ❌ Form handling
- ❌ Navigation logic

**Location**: `src/app/[tenant]/opportunities/[id]/page.tsx`

**Evidence**:
```typescript
// 20+ STATE VARIABLES IN ONE COMPONENT! 🚨
const [isConversionModalOpen, setIsConversionModalOpen] = useState(false)
const [lead, setLead] = useState<Lead | null>(null)
const [activeEventTab, setActiveEventTab] = useState(0)
const [locations, setLocations] = useState<Record<string, any>>({})
const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
const [updatingStage, setUpdatingStage] = useState(false)
const [isLogCommunicationModalOpen, setIsLogCommunicationModalOpen] = useState(false)
const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
const [isSMSModalOpen, setIsSMSModalOpen] = useState(false)
const [showSMSThread, setShowSMSThread] = useState(false)
const [isContractModalOpen, setIsContractModalOpen] = useState(false)
const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
const [communications, setCommunications] = useState<any[]>([])
const [communicationsPage, setCommunicationsPage] = useState(1)
const [tasksKey, setTasksKey] = useState(0)
const [isActionsOpen, setIsActionsOpen] = useState(false)
const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)
const [selectedActivity, setSelectedActivity] = useState<any>(null)
const [isActivityDetailOpen, setIsActivityDetailOpen] = useState(false)
const [isEditingAccountContact, setIsEditingAccountContact] = useState(false)
const [editAccountId, setEditAccountId] = useState<string>('')
const [editContactId, setEditContactId] = useState<string>('')
const [showCloseModal, setShowCloseModal] = useState(false)
const [pendingCloseStage, setPendingCloseStage] = useState<'closed_won' | 'closed_lost' | null>(null)
const [previousStage, setPreviousStage] = useState<string | null>(null)
const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
const [updatingOwner, setUpdatingOwner] = useState(false)
```

**Impact**:
- Hard to test
- Hard to maintain
- High cognitive load
- Bugs hide easily

---

### 2. **Dependency Inversion Principle (DIP) - VIOLATED**

**The Problem**: Component depends directly on low-level details (fetch API, URLs)

**Evidence**:
```typescript
// DIRECT FETCH CALLS - TIGHTLY COUPLED! 🚨
const fetchLead = async (leadId: string) => {
  try {
    const response = await fetch(`/api/leads/${leadId}`)
    if (response.ok) {
      const leadData = await response.json()
      setLead(leadData)
    }
  } catch (error) {
    console.error('Error fetching lead:', error)
  }
}

const fetchLocations = async (eventDates: EventDate[]) => {
  try {
    const response = await fetch('/api/locations')
    if (response.ok) {
      const locationsData = await response.json()
      // ... process data
    }
  } catch (error) {
    console.error('Error fetching locations:', error)
  }
}

const fetchCommunications = async () => {
  try {
    const response = await fetch(`/api/communications?opportunity_id=${opportunityId}`)
    // ... more coupling
  }
}
```

**Should Be**: Use abstractions (hooks, services)

```typescript
// WHAT IT SHOULD LOOK LIKE (from Events page)
const { event, eventDates, loading } = useEventData(eventId)
const references = useEventReferences(session, tenantSubdomain)
const { invoices, activities } = useEventTabs(eventId, session, tenant)
```

---

### 3. **Open/Closed Principle - VIOLATED**

**The Problem**: Adding new features requires modifying the component

**Evidence**:
- Want to add new modal? Edit component + add state
- Want to add new action? Edit dropdown menu hardcoded JSX
- Want to add new communication type? Edit switch statement

**Location**: Lines 643-755 (Actions dropdown hardcoded)

---

### 4. **Code Duplication - SEVERE**

**Problem #1**: "Convert to Event" logic appears **3 TIMES**:

1. Line 310-348: In `updateStage` function
2. Line 505-537: In `handleConvertToEvent` function
3. Line 684-733: In actions dropdown handler

**Problem #2**: Similar modal open/close patterns repeated for 8+ modals

**Problem #3**: Inconsistent error handling:
- Some use `alert()` (lines 244, 465, 469, 495, 525, 677)
- Some use `toast()` (lines 269, 302, etc.)

---

### 5. **API Consistency Issues**

**Issue #1**: Not using React Query for all fetches
```typescript
// Uses React Query 👍
const { data: opportunity, isLoading } = useOpportunity(opportunityId)

// Direct fetch 👎 (lines 176-186, 204-218, 424-434)
const fetchLead = async (leadId: string) => {
  const response = await fetch(`/api/leads/${leadId}`)
  // manual state management, no caching, no retry
}
```

**Issue #2**: No retry logic on network failures

**Issue #3**: Inconsistent error messages

---

## ✅ Events Detail Page - GOOD EXAMPLE

### What They Did Right:

**1. Proper Separation of Concerns**:
```typescript
// DATA LAYER - Custom hooks handle fetching
const eventData = useEventData(eventId)
const references = useEventReferences(session, tenantSubdomain)
const tabs = useEventTabs(eventId, session, tenant)
const staff = useEventStaff(eventId, session, tenant)

// STATE MANAGEMENT LAYER - Context for shared state
const context = useEventDetail()

// SERVICE LAYER - Abstracted API calls
await eventsService.update(eventId, data)
await eventsService.updateEventDate(dateId, data)
```

**2. Service Layer Pattern**:
```typescript
// src/lib/api/services/eventsService.ts
export const eventsService = {
  getAll: () => fetch('/api/events').then(r => r.json()),
  getById: (id: string) => fetch(`/api/events/${id}`).then(r => r.json()),
  update: (id: string, data: any) => fetch(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }).then(r => r.json()),
  // ... more methods
}
```

**3. Context Pattern for Shared State**:
```typescript
// src/contexts/EventDetailContext.tsx
export const EventDetailProvider = ({ children }) => {
  const [modals, setModals] = useState({...})
  const [editing, setEditing] = useState({...})

  return (
    <EventDetailContext.Provider value={{modals, editing, actions}}>
      {children}
    </EventDetailContext.Provider>
  )
}
```

**4. Component-Based UI**:
```typescript
<EventHeader event={event} />
<EventStatCard icon={...} title="..." value="..." />
<EventProgressIndicator stages={...} current={...} />
<EventInformationCard event={event} />
<EventDatesCard dates={eventDates} />
```

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Create Service Layer for Opportunities

**Create**: `src/lib/api/services/opportunitiesService.ts`

```typescript
export const opportunitiesService = {
  async getById(id: string) {
    const response = await fetch(`/api/opportunities/${id}`)
    if (!response.ok) throw new Error('Failed to fetch opportunity')
    return response.json()
  },

  async update(id: string, data: Partial<Opportunity>) {
    const response = await fetch(`/api/opportunities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update opportunity')
    return response.json()
  },

  async updateStage(id: string, stage: string, closeReason?: string, closeNotes?: string) {
    return this.update(id, {
      stage,
      actual_close_date: stage === 'closed_won' ? new Date().toISOString().split('T')[0] : null,
      close_reason: closeReason,
      close_notes: closeNotes
    })
  },

  async updateOwner(id: string, ownerId: string | null) {
    return this.update(id, { owner_id: ownerId })
  },

  async convertToEvent(id: string, eventData?: any) {
    const response = await fetch(`/api/opportunities/${id}/convert-to-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventData })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to convert to event')
    }
    return response.json()
  },

  async clone(id: string) {
    const response = await fetch(`/api/opportunities/${id}/clone`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to clone opportunity')
    return response.json()
  },

  async delete(id: string) {
    const response = await fetch(`/api/opportunities/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete opportunity')
    return response.json()
  }
}
```

---

### Priority 2: Create Custom Hooks

**Create**: `src/hooks/useOpportunityReferences.ts`

```typescript
export function useOpportunityReferences(session: any, tenantSubdomain: string) {
  const { data: accounts = [] } = useAccounts()
  const { data: contacts = [] } = useContacts()
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations')
      return response.json()
    },
    enabled: Boolean(session && tenantSubdomain)
  })
  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => fetchTenantUsers(),
    enabled: Boolean(session && tenantSubdomain)
  })

  return { accounts, contacts, locations, tenantUsers }
}
```

**Create**: `src/hooks/useOpportunityTabs.ts`

```typescript
export function useOpportunityTabs(opportunityId: string, session: any, tenant: any) {
  const [communicationsPage, setCommunicationsPage] = useState(1)

  const { data: communications = [], refetch: refetchCommunications } = useQuery({
    queryKey: ['communications', opportunityId, communicationsPage],
    queryFn: async () => {
      const response = await fetch(`/api/communications?opportunity_id=${opportunityId}&page=${communicationsPage}`)
      return response.json()
    },
    enabled: Boolean(session && tenant && opportunityId)
  })

  const { data: lead, refetch: refetchLead } = useQuery({
    queryKey: ['opportunity-lead', opportunityId],
    queryFn: async () => {
      const opp = await opportunitiesService.getById(opportunityId)
      if (!opp.lead_id) return null
      const response = await fetch(`/api/leads/${opp.lead_id}`)
      return response.json()
    },
    enabled: Boolean(session && tenant && opportunityId)
  })

  return {
    communications,
    communicationsPage,
    setCommunicationsPage,
    lead,
    refetchCommunications,
    refetchLead
  }
}
```

---

### Priority 3: Create Context for Modals

**Create**: `src/contexts/OpportunityDetailContext.tsx`

```typescript
interface OpportunityDetailContextType {
  modals: {
    isConversionModalOpen: boolean
    isLogCommunicationModalOpen: boolean
    isEmailModalOpen: boolean
    isSMSModalOpen: boolean
    isContractModalOpen: boolean
    isTaskModalOpen: boolean
    showCloseModal: boolean
    // ... others
  }
  openModal: (modalName: string) => void
  closeModal: (modalName: string) => void

  editing: {
    isEditingAccountContact: boolean
    editAccountId: string
    editContactId: string
    // ... others
  }
  startEditing: (field: string, value: any) => void
  cancelEditing: (field: string) => void
  saveEditing: (field: string) => Promise<void>
}

export const OpportunityDetailProvider = ({ children, opportunityId }) => {
  // State management for all modals and editing
  // ...

  return (
    <OpportunityDetailContext.Provider value={value}>
      {children}
    </OpportunityDetailContext.Provider>
  )
}
```

---

### Priority 4: Extract Reusable Components

**Create**: Component files for:
- `OpportunityHeader.tsx` - Header with back button and actions
- `OpportunityStageProgress.tsx` - Stage progress indicator
- `OpportunityStatCard.tsx` - Reusable stat card
- `OpportunityActionsMenu.tsx` - Actions dropdown (configurable)
- `OpportunityCloseModal.tsx` - Already exists, keep it

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Foundation (2-3 hours)
1. ✅ Create `opportunitiesService.ts`
2. ✅ Create `useOpportunityReferences.ts` hook
3. ✅ Create `useOpportunityTabs.ts` hook
4. ✅ Test services and hooks

### Phase 2: State Management (2 hours)
5. ✅ Create `OpportunityDetailContext.tsx`
6. ✅ Move modal state to context
7. ✅ Move editing state to context
8. ✅ Update component to use context

### Phase 3: Refactor Component (3 hours)
9. ✅ Extract components (Header, Stats, Actions, etc.)
10. ✅ Replace direct fetch calls with service layer
11. ✅ Replace useState hooks with custom hooks
12. ✅ Remove duplicate "convert to event" logic

### Phase 4: Polish (1 hour)
13. ✅ Consistent error handling (all toast, no alert)
14. ✅ Add retry logic via React Query
15. ✅ Add loading states
16. ✅ Update TypeScript types

**Total Estimated Time**: 8-9 hours

---

## 🎯 SUCCESS CRITERIA

After refactoring, the Opportunities Detail page should have:

- ✅ **< 400 lines** in main component (down from 1,271)
- ✅ **< 5 useState hooks** in main component (down from 20+)
- ✅ **Service layer** for all API calls
- ✅ **Custom hooks** for data fetching
- ✅ **Context** for shared state
- ✅ **Extracted components** for UI sections
- ✅ **Consistent error handling** (toast only)
- ✅ **No code duplication**
- ✅ **SOLID-compliant** architecture

---

## 📊 Current State vs Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Main Component Lines | 1,271 | < 400 |
| useState Hooks | 20+ | < 5 |
| useEffect Hooks | 5 | 1-2 |
| Direct fetch() calls | 7+ | 0 |
| Service Layer | ❌ None | ✅ opportunitiesService |
| Custom Hooks | 3 | 6+ |
| Context | ❌ None | ✅ OpportunityDetailContext |
| Code Duplication | High | None |
| SOLID Compliance | Poor | Good |

---

## ⚠️ RISKS & MITIGATION

**Risk 1**: Breaking existing functionality
- **Mitigation**: Refactor incrementally, test after each phase

**Risk 2**: TypeScript errors during refactor
- **Mitigation**: Update types as we go, use proper interfaces

**Risk 3**: React Query cache invalidation issues
- **Mitigation**: Use consistent query keys, test refetch scenarios

---

## 🚀 RECOMMENDATION

**DO NOT MERGE** the opportunities detail page in its current state until refactored to match the quality of the events detail page.

**SUGGESTED APPROACH**:
1. Create new branch: `feature/refactor-opportunity-detail`
2. Follow implementation plan above
3. Test thoroughly
4. Create PR with before/after comparison
5. Merge when SOLID-compliant

---

**Conclusion**: The Events Detail page should be the **TEMPLATE** for all detail pages. The Opportunities Detail page needs a comprehensive refactor to match this quality standard.
