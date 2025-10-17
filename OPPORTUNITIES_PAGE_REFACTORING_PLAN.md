# Opportunities Page Refactoring Plan

## Overview
The `src/app/[tenant]/opportunities/page.tsx` file is **1,647 lines** and contains a monolithic component that handles multiple responsibilities. This document outlines opportunities to refactor it into smaller, more maintainable pieces.

## Current Issues

1. **Single component with 1,647 lines** - Too large to maintain effectively
2. **20+ state variables** - Complex state management
3. **Multiple responsibilities** - Data fetching, filtering, rendering, drag-and-drop, modals
4. **Duplicated rendering logic** - Mobile and desktop views have similar but separate code
5. **Complex nested JSX** - Hard to read and test
6. **No separation of concerns** - Business logic mixed with presentation

---

## Proposed Refactoring Strategy

### Phase 1: Extract Custom Hooks (Business Logic)

#### 1.1 `useOpportunitiesData` Hook
**Location:** `src/hooks/useOpportunitiesData.ts`

**Responsibilities:**
- Fetch opportunities from API
- Handle pagination state
- Manage loading states
- Handle data refresh

**Current code to extract (lines 39-131):**
```typescript
// State
const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([])
const [localLoading, setLocalLoading] = useState(true)
const [currentPage, setCurrentPage] = useState(1)
const [totalItems, setTotalItems] = useState(0)
const [totalPages, setTotalPages] = useState(0)

// fetchOpportunities function
// handlePageChange function
```

**Benefits:**
- Reusable across different opportunity views
- Easier to test data fetching logic
- Separates data concerns from UI

---

#### 1.2 `useOpportunityFilters` Hook
**Location:** `src/hooks/useOpportunityFilters.ts`

**Responsibilities:**
- Manage filter state (search, stage, owner, date)
- Apply filters to opportunity list
- Handle filter reset

**Current code to extract (lines 41-43, 51-52, 339-350):**
```typescript
const [searchTerm, setSearchTerm] = useState('')
const [filterStage, setFilterStage] = useState<string>('all')
const [filterOwner, setFilterOwner] = useState<string>('all')
const [dateFilter, setDateFilter] = useState<string>('all')
const [dateType, setDateType] = useState<'created' | 'closed'>('created')

// filteredOpportunities logic
// getDateRange function
// isOpportunityInDateRange function
```

**Benefits:**
- Centralized filter logic
- Easier to add new filters
- Testable filter logic

---

#### 1.3 `useOpportunityCalculations` Hook
**Location:** `src/hooks/useOpportunityCalculations.ts`

**Responsibilities:**
- Calculate statistics (total, expected value)
- Manage calculation mode
- Compute weighted values

**Current code to extract (lines 48, 289-330):**
```typescript
const [calculationMode, setCalculationMode] = useState<'total' | 'expected'>('total')

// calculateTotalOpportunities
// calculateExpectedValue
// getCurrentCalculation
```

**Benefits:**
- Isolated calculation logic
- Easy to add new calculation modes
- Testable business logic

---

#### 1.4 `useOpportunityDragAndDrop` Hook
**Location:** `src/hooks/useOpportunityDragAndDrop.ts`

**Responsibilities:**
- Manage drag-and-drop state
- Handle drag events
- Update opportunity stage via drag-and-drop

**Current code to extract (lines 46-47, 370-481):**
```typescript
const [draggedOpportunity, setDraggedOpportunity] = useState<OpportunityWithRelations | null>(null)
const [dragOverStage, setDragOverStage] = useState<string | null>(null)

// handleDragStart
// handleDragOver
// handleDragLeave
// handleDrop
// handleDragEnd
// updateOpportunityStage
```

**Benefits:**
- Encapsulated drag-and-drop logic
- Reusable for other entity types
- Cleaner component code

---

### Phase 2: Extract UI Components

#### 2.1 `OpportunityStatsCard` Component
**Location:** `src/components/opportunities/opportunity-stats-card.tsx`

**Props:**
```typescript
interface OpportunityStatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon?: React.ReactNode
  className?: string
}
```

**Current code (lines 547-627):** Duplicated 3 times for different stats

**Benefits:**
- DRY principle
- Reusable stat card
- Easier to style consistently

---

#### 2.2 `OpportunityCalculationModeToggle` Component
**Location:** `src/components/opportunities/calculation-mode-toggle.tsx`

**Props:**
```typescript
interface CalculationModeToggleProps {
  mode: 'total' | 'expected'
  onChange: (mode: 'total' | 'expected') => void
  settings: any
}
```

**Current code (lines 507-544):** Calculation mode section

**Benefits:**
- Self-contained toggle UI
- Easier to modify modes
- Clear component responsibility

---

#### 2.3 `OpportunityFilters` Component
**Location:** `src/components/opportunities/opportunity-filters.tsx`

**Props:**
```typescript
interface OpportunityFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterStage: string
  onStageChange: (value: string) => void
  filterOwner: string
  onOwnerChange: (value: string) => void
  dateFilter: string
  onDateFilterChange: (value: string) => void
  dateType: 'created' | 'closed'
  onDateTypeChange: (value: 'created' | 'closed') => void
  stages: any[]
  tenantUsers: TenantUser[]
}
```

**Current code (lines 630-734):** Filter section

**Benefits:**
- Isolated filter UI
- Reusable across other entity lists
- Easier to test

---

#### 2.4 `OpportunityTableView` Component
**Location:** `src/components/opportunities/opportunity-table-view.tsx`

**Props:**
```typescript
interface OpportunityTableViewProps {
  opportunities: OpportunityWithRelations[]
  loading: boolean
  tenantUsers: TenantUser[]
  tenantSubdomain: string
  filterStage: string
  settings: any
  onEmailClick: (opp: OpportunityWithRelations) => void
  onSMSClick: (opp: OpportunityWithRelations) => void
  onDelete: (id: string) => void
}
```

**Current code (lines 1077-1378):** Desktop table view

**Benefits:**
- Focused table component
- Easier to maintain table logic
- Can be tested independently

---

#### 2.5 `OpportunityMobileCard` Component
**Location:** `src/components/opportunities/opportunity-mobile-card.tsx`

**Props:**
```typescript
interface OpportunityMobileCardProps {
  opportunity: OpportunityWithRelations
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  settings: any
  onEmailClick: () => void
  onSMSClick: () => void
  index: number
}
```

**Current code (lines 958-1062):** Mobile card rendering

**Benefits:**
- Reusable mobile card
- Easier to update mobile UI
- Separate mobile concerns

---

#### 2.6 `OpportunityPipelineView` Component
**Location:** `src/components/opportunities/opportunity-pipeline-view.tsx`

**Props:**
```typescript
interface OpportunityPipelineViewProps {
  opportunities: OpportunityWithRelations[]
  filteredOpportunities: OpportunityWithRelations[]
  stages: any[]
  settings: any
  tenantUsers: TenantUser[]
  tenantSubdomain: string
  draggedOpportunity: OpportunityWithRelations | null
  dragOverStage: string | null
  onDragStart: (e: React.DragEvent, opp: OpportunityWithRelations) => void
  onDragOver: (e: React.DragEvent, stage: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, stage: string) => void
  onDragEnd: () => void
}
```

**Current code (lines 1382-1509):** Pipeline view

**Benefits:**
- Isolated pipeline logic
- Easier to maintain drag-and-drop
- Can optimize rendering separately

---

#### 2.7 `OpportunityPipelineCard` Component
**Location:** `src/components/opportunities/opportunity-pipeline-card.tsx`

**Props:**
```typescript
interface OpportunityPipelineCardProps {
  opportunity: OpportunityWithRelations
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  settings: any
  isDragged: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onClick: () => void
}
```

**Current code (lines 1440-1500):** Individual pipeline card

**Benefits:**
- Reusable pipeline card
- Easier to style and animate
- Clear single responsibility

---

#### 2.8 `ClosedOpportunitiesBucket` Component
**Location:** `src/components/opportunities/closed-opportunities-bucket.tsx`

**Props:**
```typescript
interface ClosedOpportunitiesBucketProps {
  type: 'won' | 'lost'
  opportunities: OpportunityWithRelations[]
  dragOverStage: string | null
  onDragOver: (e: React.DragEvent, stage: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, stage: string) => void
  onClick: () => void
}
```

**Current code (lines 743-790):** Closed buckets in pipeline view

**Benefits:**
- Self-contained bucket UI
- Reusable for won/lost
- Cleaner pipeline view

---

#### 2.9 `ClosedOpportunitiesPopup` Component
**Location:** `src/components/opportunities/closed-opportunities-popup.tsx`

**Props:**
```typescript
interface ClosedOpportunitiesPopupProps {
  type: 'won' | 'lost'
  opportunities: OpportunityWithRelations[]
  tenantSubdomain: string
  onClose: () => void
  onDragStart: (e: React.DragEvent, opp: OpportunityWithRelations) => void
  onDragEnd: () => void
}
```

**Current code (lines 1534-1628):** Bucket popup modal

**Benefits:**
- Isolated modal logic
- Easier to maintain
- Can be reused for other views

---

#### 2.10 `OpportunityEmptyState` Component
**Location:** `src/components/opportunities/opportunity-empty-state.tsx`

**Props:**
```typescript
interface OpportunityEmptyStateProps {
  hasFilters: boolean
  searchTerm: string
  filterStage: string
  filterOwner: string
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  canCreate: boolean
  onClearFilters: () => void
  onClearSearch: () => void
  onClearStage: () => void
  onClearOwner: () => void
}
```

**Current code (lines 857-955, 1131-1230):** Empty state (duplicated for mobile/desktop)

**Benefits:**
- DRY principle
- Consistent empty states
- Easier to update messaging

---

#### 2.11 `OpportunitySuccessAnimation` Component
**Location:** `src/components/opportunities/opportunity-success-animation.tsx`

**Props:**
```typescript
interface OpportunitySuccessAnimationProps {
  type: 'won' | 'lost' | null
}
```

**Current code (lines 1511-1532):** Success animations

**Benefits:**
- Reusable animation component
- Easier to customize animations
- Cleaner main component

---

### Phase 3: Extract Utility Functions

#### 3.1 Date Range Utilities
**Location:** `src/lib/date-range-utils.ts`

**Functions:**
```typescript
export function getDateRange(filter: string): { start: Date; end: Date } | null
export function isInDateRange(date: Date, range: { start: Date; end: Date }): boolean
```

**Current code (lines 191-268):** `getDateRange` function

**Benefits:**
- Reusable date logic
- Testable utility functions
- Can be used across app

---

#### 3.2 Opportunity Filter Utils
**Location:** `src/lib/opportunity-filter-utils.ts`

**Functions:**
```typescript
export function filterOpportunities(
  opportunities: OpportunityWithRelations[],
  filters: OpportunityFilters
): OpportunityWithRelations[]

export function matchesSearch(opportunity: OpportunityWithRelations, searchTerm: string): boolean
```

**Current code (lines 339-350):** Filter logic

**Benefits:**
- Centralized filter logic
- Easy to test
- Reusable

---

### Phase 4: Create Container Component

#### 4.1 `OpportunitiesPageContainer` Component
**Location:** `src/app/[tenant]/opportunities/page.tsx` (refactored)

**Responsibilities:**
- Use custom hooks for data and state
- Compose child components
- Handle high-level event coordination
- Manage modals

**Estimated size:** ~200-300 lines (down from 1,647)

**Structure:**
```typescript
function OpportunitiesPageContent() {
  // Custom hooks
  const { opportunities, loading, pagination, fetchOpportunities } = useOpportunitiesData()
  const { filters, setFilter, filteredOpportunities, clearFilters } = useOpportunityFilters(opportunities)
  const { stats, calculationMode, setCalculationMode } = useOpportunityCalculations(filteredOpportunities)
  const { dragState, dragHandlers } = useOpportunityDragAndDrop({ onUpdate: fetchOpportunities })
  
  // Modal state
  const [modals, setModals] = useState({...})
  
  // Render composition
  return (
    <AppLayout>
      <OpportunityHeader />
      <OpportunityCalculationModeToggle />
      <OpportunityStatsCards stats={stats} />
      <OpportunityFilters filters={filters} />
      <OpportunityViewToggle />
      
      {currentView === 'table' && <OpportunityTableView />}
      {currentView === 'pipeline' && <OpportunityPipelineView />}
      
      <OpportunityModals modals={modals} />
    </AppLayout>
  )
}
```

---

## Implementation Roadmap

### Step 1: Extract Hooks (Low Risk)
1. Create `useOpportunitiesData` hook
2. Create `useOpportunityFilters` hook
3. Create `useOpportunityCalculations` hook
4. Create `useOpportunityDragAndDrop` hook
5. Update main component to use hooks

**Estimated time:** 2-3 hours  
**Risk:** Low (hooks are backwards compatible)

---

### Step 2: Extract Utility Functions (Low Risk)
1. Create `date-range-utils.ts`
2. Create `opportunity-filter-utils.ts`
3. Update component to use utilities

**Estimated time:** 1 hour  
**Risk:** Low (pure functions)

---

### Step 3: Extract Simple Components (Medium Risk)
1. `OpportunityStatsCard`
2. `OpportunityCalculationModeToggle`
3. `OpportunitySuccessAnimation`
4. `OpportunityEmptyState`

**Estimated time:** 2-3 hours  
**Risk:** Low-Medium (mostly presentational)

---

### Step 4: Extract Complex Components (Higher Risk)
1. `OpportunityFilters`
2. `OpportunityMobileCard`
3. `OpportunityPipelineCard`
4. `ClosedOpportunitiesBucket`
5. `ClosedOpportunitiesPopup`

**Estimated time:** 3-4 hours  
**Risk:** Medium (more complex interactions)

---

### Step 5: Extract View Components (Highest Risk)
1. `OpportunityTableView`
2. `OpportunityPipelineView`

**Estimated time:** 4-5 hours  
**Risk:** Higher (large components with complex logic)

---

### Step 6: Final Integration & Testing
1. Update main component to compose all pieces
2. Test all functionality
3. Fix any bugs
4. Update documentation

**Estimated time:** 2-3 hours  
**Risk:** Medium (integration testing)

---

## Total Estimated Time
**20-25 hours** of development work

---

## Benefits of This Refactoring

### Maintainability
- **Smaller files** are easier to understand and modify
- **Clear separation** of concerns
- **Easier debugging** with isolated components

### Testability
- **Hooks can be tested** independently
- **Components can be tested** in isolation
- **Utility functions** are pure and testable

### Reusability
- **Components can be reused** in other parts of the app
- **Hooks can be shared** across similar pages
- **Utilities are generic** and reusable

### Performance
- **Smaller components** can be memoized more effectively
- **Isolated re-renders** reduce unnecessary updates
- **Code splitting** opportunities

### Developer Experience
- **Easier onboarding** for new developers
- **Faster feature development** with composable parts
- **Better IDE performance** with smaller files

---

## Alternative: Incremental Refactoring

If a full refactoring is too risky, consider an **incremental approach**:

1. **Week 1:** Extract hooks only (no UI changes)
2. **Week 2:** Extract 2-3 simple components
3. **Week 3:** Extract 2-3 more components
4. **Week 4:** Extract view components
5. **Week 5:** Final polish and testing

This allows for:
- Gradual improvement
- Easier rollback if issues arise
- Testing in production between steps
- Less disruption to ongoing development

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:** 
- Comprehensive testing after each step
- Feature flags for gradual rollout
- Keep original component as backup

### Risk 2: State Management Complexity
**Mitigation:**
- Consider using a state management library (Zustand, Jotai)
- Document state flow clearly
- Use TypeScript strictly

### Risk 3: Performance Regression
**Mitigation:**
- Profile before and after refactoring
- Use React.memo strategically
- Monitor bundle size

---

## Conclusion

The opportunities page is an excellent candidate for refactoring. The benefits significantly outweigh the risks, especially if done incrementally. The proposed component structure will:

1. **Reduce complexity** from 1,647 lines to ~300 lines in the main component
2. **Improve maintainability** with 20+ focused, single-responsibility components
3. **Enable better testing** with isolated units
4. **Facilitate future development** with reusable building blocks

**Recommended approach:** Start with Phase 1 (hooks) for immediate benefits with minimal risk, then proceed incrementally through the other phases.

