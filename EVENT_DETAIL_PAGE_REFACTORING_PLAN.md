# Event Detail Page - Comprehensive Refactoring Plan

**Date:** October 17, 2025  
**Target File:** `src/app/[tenant]/events/[id]/page.tsx`  
**Current Size:** 3,373 lines  
**Target Size:** ~700-850 lines (75-79% reduction)  
**Estimated Timeline:** 8-11 hours over 2-3 days

---

## 📊 EXECUTIVE SUMMARY

### Current State Analysis:
- **Total Lines:** 3,373
- **useState Hooks:** 50 state variables
- **useCallback Hooks:** 11 data fetching functions
- **useEffect Hooks:** 2
- **Major Sections:** 11 tab content areas
- **Inline Modals:** 6+ modal components
- **Utility Functions:** 3 color/status helpers
- **Component Files Imported:** 17

### Target State:
- **Main File:** ~700-850 lines (orchestration only)
- **Custom Hooks:** 5-6 hooks (~600-800 lines total)
- **UI Components:** 25-30 components (~2,000-2,500 lines total)
- **Utility Files:** 2-3 files (~200-300 lines total)
- **Total Codebase:** ~3,500-4,000 lines (organized, reusable)
- **Net Reduction in Main File:** 79% (3,373 → 700)

### Expected Benefits:
1. ✅ 79% reduction in main file complexity
2. ✅ Highly reusable components across event pages
3. ✅ Easier to test individual pieces
4. ✅ Faster feature development
5. ✅ Better maintainability
6. ✅ Clearer separation of concerns

---

## 🔍 STEP 1: CURRENT FILE STRUCTURE ANALYSIS

### State Management Breakdown (50 useState hooks):

**Core Event Data (6):**
- `event` - Main event object
- `eventDates` - Event dates array
- `localLoading` - Loading state
- `activeTab` - Current tab selection
- `invoices` - Invoices list
- `activities` - Activities list

**Related Data Collections (6):**
- `attachments` - File attachments
- `communications` - Communication history
- `accounts` - Accounts dropdown data
- `contacts` - Contacts dropdown data
- `locations` - Locations dropdown data
- `users` - Users for staff assignment

**Loading States (5):**
- `loadingInvoices`
- `loadingActivities`
- `loadingAttachments`
- `loadingStaff`
- (implicit loading in callbacks)

**Modal States (12):**
- `isTaskModalOpen`
- `isLogCommunicationModalOpen`
- `isEmailModalOpen`
- `isSMSModalOpen`
- `isCommunicationDetailOpen`
- `isActivityDetailOpen`
- `isEventDateDetailOpen`
- `isEditingAccountContact`
- `isEditingEventDate`
- `isEditingPaymentStatus`
- `isEditingDescription`
- `isAddingStaff`

**Selected/Active Items (8):**
- `selectedCommunication`
- `selectedActivity`
- `selectedEventDate`
- `selectedUserId`
- `selectedStaffRoleId`
- `activeEventDateTab`
- `editingStaffId`
- `selectedDateTimes`

**Form Data (11):**
- `editAccountId`
- `editContactId`
- `editEventDateData`
- `editedDescription`
- `staffRole`
- `staffNotes`
- `paymentStatusOptions`
- `communicationsPage`
- `tasksKey`
- `operationsTeamExpanded`
- `eventStaffExpanded`

**Staff Management (2):**
- `staffAssignments`
- `staffRoles`

### Data Fetching Functions (11 useCallback):
1. `fetchEvent` - Get main event data
2. `fetchEventDates` - Get event dates/times
3. `fetchInvoices` - Get invoices for event
4. `fetchActivities` - Get activity log
5. `fetchAttachments` - Get file attachments
6. `fetchCommunications` - Get communications
7. `fetchStaff` - Get staff assignments
8. `fetchUsers` - Get available users
9. `fetchStaffRoles` - Get staff role options
10. `fetchPaymentStatusOptions` - Get payment status dropdown
11. `fetchAccountsAndContacts` - Get account/contact dropdowns

### useEffect Hooks (2):
1. Initial data fetch on mount
2. Tab-specific data fetch on tab change

### Utility Functions (3):
1. `getStatusColor(status)` - Event status colors
2. `getEventTypeColor(type)` - Event type colors
3. `getPaymentStatusColor(color)` - Payment status colors

### Main UI Sections (11 TabsContent):
1. **Overview** - Event info, dates, account/contact, status
2. **Invoices** - Invoice list and creation
3. **Activity** - Activity timeline
4. **Files** - Attachments section
5. **Tasks** - Tasks section
6. **Design** - Design items component
7. **Logistics** - Logistics component
8. **Communications** - Communications history
9. **Staffing** - Staff assignments
10. **Equipment** - Equipment/booth assignments
11. **Details** - Scope and detailed description

### Inline Modals/Overlays (6+):
1. Communication detail modal
2. Activity detail modal
3. Event date detail modal
4. Create task modal (imported)
5. Log communication modal (imported)
6. Send email modal (imported)
7. Send SMS modal (imported)

### Repeated Patterns Identified:
1. **Tab content structure** - Each tab follows same pattern of loading/empty/content
2. **Edit inline forms** - Multiple inline edit patterns (description, payment status, account/contact)
3. **Detail modals** - Similar structure for showing communication/activity/date details
4. **Data fetching pattern** - All fetch functions follow same structure
5. **Badge/status displays** - Multiple color-coded badges
6. **Expandable sections** - Operations team, event staff have expand/collapse
7. **Loading skeletons** - Similar loading states across tabs

---

## 🎯 STEP 2: PHASE 1 - CUSTOM HOOKS TO EXTRACT

### HOOK 1: useEventData
**File:** `src/hooks/useEventData.ts`  
**Purpose:** Core event data fetching and management  
**Lines:** ~180-220

**State:**
```typescript
- event: EventWithRelations | null
- eventDates: EventDate[]
- loading: boolean
- error: string | null
```

**Functions:**
```typescript
- fetchEvent()
- fetchEventDates()
- updateEvent(data)
- deleteEvent()
- refetch()
```

**Dependencies:** session, tenant, eventId

---

### HOOK 2: useEventTabs
**File:** `src/hooks/useEventTabs.ts`  
**Purpose:** Manage tab-specific data loading  
**Lines:** ~200-250

**State:**
```typescript
- activeTab: string
- invoices: any[]
- activities: any[]
- attachments: any[]
- communications: any[]
- loadingInvoices: boolean
- loadingActivities: boolean
- loadingAttachments: boolean
- communicationsPage: number
```

**Functions:**
```typescript
- setActiveTab(tab)
- fetchInvoices()
- fetchActivities()
- fetchAttachments()
- fetchCommunications()
- refetchActiveTab()
```

**Dependencies:** activeTab, session, tenant, eventId

---

### HOOK 3: useEventStaff
**File:** `src/hooks/useEventStaff.ts`  
**Purpose:** Staff assignment management  
**Lines:** ~150-180

**State:**
```typescript
- staffAssignments: any[]
- users: any[]
- staffRoles: any[]
- loadingStaff: boolean
- isAddingStaff: boolean
- selectedUserId: string
- selectedStaffRoleId: string
- staffNotes: string
- selectedDateTimes: Array<{...}>
- editingStaffId: string | null
```

**Functions:**
```typescript
- fetchStaff()
- fetchUsers()
- fetchStaffRoles()
- addStaff(data)
- removeStaff(id)
- updateStaff(id, data)
```

---

### HOOK 4: useEventModals
**File:** `src/hooks/useEventModals.ts`  
**Purpose:** Centralized modal state management  
**Lines:** ~120-150

**State:**
```typescript
- taskModal: { isOpen, data }
- communicationModal: { isOpen, type }
- emailModal: { isOpen }
- smsModal: { isOpen }
- communicationDetail: { isOpen, data }
- activityDetail: { isOpen, data }
- eventDateDetail: { isOpen, data, isEditing }
```

**Functions:**
```typescript
- openTaskModal()
- closeTaskModal()
- openCommunicationModal()
- openEmailModal()
- openSMSModal()
- openCommunicationDetail(comm)
- openActivityDetail(activity)
- openEventDateDetail(date)
- closeAllModals()
```

---

### HOOK 5: useEventEditing
**File:** `src/hooks/useEventEditing.ts`  
**Purpose:** Inline editing state management  
**Lines:** ~100-130

**State:**
```typescript
- isEditingAccountContact: boolean
- editAccountId: string
- editContactId: string
- isEditingPaymentStatus: boolean
- isEditingDescription: boolean
- editedDescription: string
- isEditingEventDate: boolean
- editEventDateData: Partial<EventDate>
```

**Functions:**
```typescript
- startEditingAccountContact()
- saveAccountContact()
- cancelEditingAccountContact()
- startEditingDescription()
- saveDescription()
- cancelEditingDescription()
- startEditingPaymentStatus()
- savePaymentStatus()
```

---

### HOOK 6: useEventReferences
**File:** `src/hooks/useEventReferences.ts`  
**Purpose:** Reference data (dropdowns, options)  
**Lines:** ~80-100

**State:**
```typescript
- accounts: any[]
- contacts: any[]
- locations: any[]
- paymentStatusOptions: any[]
```

**Functions:**
```typescript
- fetchAccountsAndContacts()
- fetchLocations()
- fetchPaymentStatusOptions()
- refetchReferences()
```

---

**TOTAL HOOKS:** 6 hooks  
**TOTAL ESTIMATED LINES:** ~830-1,030 lines

---

## 🎨 STEP 3: PHASE 2 - UI COMPONENTS TO EXTRACT

### EASY COMPONENTS (Extract First - Low Risk):

#### 1. EventStatusBadge
**File:** `src/components/events/event-status-badge.tsx`  
**Lines:** ~40-50  
**Purpose:** Display event status with color-coded badge
```typescript
Props: { status: string, size?: 'sm' | 'md' | 'lg' }
```

#### 2. EventTypeBadge
**File:** `src/components/events/event-type-badge.tsx`  
**Lines:** ~50-60  
**Purpose:** Display event category/type with color
```typescript
Props: { category?: EventCategory, type?: EventType }
```

#### 3. EventProgressIndicator
**File:** `src/components/events/event-progress-indicator.tsx`  
**Lines:** ~50-70  
**Purpose:** Show task completion progress
```typescript
Props: { completed: number, total: number }
```

#### 4. EventStatCard
**File:** `src/components/events/event-stat-card.tsx`  
**Lines:** ~50-70  
**Purpose:** Reusable stat display card
```typescript
Props: { icon: ReactNode, label: string, value: string | number, color?: string }
```

#### 5. PaymentStatusBadge
**File:** `src/components/events/payment-status-badge.tsx`  
**Lines:** ~50-60  
**Purpose:** Display payment status with colors
```typescript
Props: { status: string, color: string }
```

#### 6. EventHeader
**File:** `src/components/events/event-header.tsx`  
**Lines:** ~80-100  
**Purpose:** Page header with title, back button, actions
```typescript
Props: {
  title: string
  tenantSubdomain: string
  eventId: string
  canManageEvents: boolean
  onDelete: () => void
}
```

#### 7. EmptyState
**File:** `src/components/events/empty-state.tsx`  
**Lines:** ~40-50  
**Purpose:** Reusable empty state display
```typescript
Props: { icon: ReactNode, message: string, action?: ReactNode }
```

#### 8. LoadingState
**File:** `src/components/events/loading-state.tsx`  
**Lines:** ~30-40  
**Purpose:** Reusable loading spinner/skeleton
```typescript
Props: { message?: string, variant?: 'spinner' | 'skeleton' }
```

**EASY SUBTOTAL:** 8 components, ~380-470 lines

---

### MEDIUM COMPONENTS (Extract Second):

#### 9. EventInformationCard
**File:** `src/components/events/event-information-card.tsx`  
**Lines:** ~150-200  
**Purpose:** Display event basic information section
```typescript
Props: {
  event: EventWithRelations
  canEdit: boolean
  onEdit: () => void
}
```

#### 10. EventDatesCard
**File:** `src/components/events/event-dates-card.tsx`  
**Lines:** ~180-220  
**Purpose:** Display event dates with tabs and details
```typescript
Props: {
  eventDates: EventDate[]
  activeTab: number
  onTabChange: (index: number) => void
  onDateClick: (date: EventDate) => void
  canEdit: boolean
}
```

#### 11. EventAccountContactCard
**File:** `src/components/events/event-account-contact-card.tsx`  
**Lines:** ~120-150  
**Purpose:** Display and edit account/contact info
```typescript
Props: {
  event: EventWithRelations
  accounts: any[]
  contacts: any[]
  isEditing: boolean
  onStartEdit: () => void
  onSave: (accountId: string, contactId: string) => void
  onCancel: () => void
}
```

#### 12. EventDescriptionCard
**File:** `src/components/events/event-description-card.tsx`  
**Lines:** ~100-130  
**Purpose:** Display and edit description
```typescript
Props: {
  description: string | null
  isEditing: boolean
  onStartEdit: () => void
  onSave: (description: string) => void
  onCancel: () => void
  canEdit: boolean
}
```

#### 13. EventInvoicesList
**File:** `src/components/events/event-invoices-list.tsx`  
**Lines:** ~150-180  
**Purpose:** Display invoices tab content
```typescript
Props: {
  invoices: any[]
  loading: boolean
  eventId: string
  tenantSubdomain: string
  canCreate: boolean
}
```

#### 14. EventActivitiesList
**File:** `src/components/events/event-activities-list.tsx`  
**Lines:** ~150-180  
**Purpose:** Display activity timeline
```typescript
Props: {
  activities: any[]
  loading: boolean
  onActivityClick: (activity: any) => void
}
```

#### 15. EventCommunicationsList
**File:** `src/components/events/event-communications-list.tsx`  
**Lines:** ~150-180  
**Purpose:** Display communications history
```typescript
Props: {
  communications: any[]
  loading: boolean
  page: number
  onPageChange: (page: number) => void
  onCommunicationClick: (comm: any) => void
  onNewCommunication: () => void
  onEmail: () => void
  onSMS: () => void
}
```

#### 16. EventStaffList
**File:** `src/components/events/event-staff-list.tsx`  
**Lines:** ~180-220  
**Purpose:** Display staff assignments with operations team
```typescript
Props: {
  staffAssignments: any[]
  users: any[]
  staffRoles: any[]
  loading: boolean
  isAddingStaff: boolean
  onAdd: (data) => void
  onRemove: (id) => void
  onUpdate: (id, data) => void
  canEdit: boolean
}
```

#### 17. EventTabsNavigation
**File:** `src/components/events/event-tabs-navigation.tsx`  
**Lines:** ~100-120  
**Purpose:** Tab navigation with icons
```typescript
Props: {
  activeTab: string
  onTabChange: (tab: string) => void
}
```

**MEDIUM SUBTOTAL:** 9 components, ~1,280-1,550 lines

---

### COMPLEX COMPONENTS (Extract Last):

#### 18. EventDateDetailModal
**File:** `src/components/events/event-date-detail-modal.tsx`  
**Lines:** ~200-250  
**Purpose:** Modal showing event date details with staff
```typescript
Props: {
  eventDate: EventDate | null
  isOpen: boolean
  isEditing: boolean
  locations: any[]
  onClose: () => void
  onEdit: () => void
  onSave: (data) => void
  onCancel: () => void
}
```

#### 19. CommunicationDetailModal
**File:** `src/components/events/communication-detail-modal.tsx`  
**Lines:** ~150-180  
**Purpose:** Modal showing communication details
```typescript
Props: {
  communication: any | null
  isOpen: boolean
  onClose: () => void
}
```

#### 20. ActivityDetailModal
**File:** `src/components/events/activity-detail-modal.tsx`  
**Lines:** ~150-180  
**Purpose:** Modal showing activity details
```typescript
Props: {
  activity: any | null
  isOpen: boolean
  onClose: () => void
}
```

#### 21. EventOverviewTab
**File:** `src/components/events/event-overview-tab.tsx`  
**Lines:** ~200-250  
**Purpose:** Complete overview tab content
```typescript
Props: {
  event: EventWithRelations
  eventDates: EventDate[]
  // ... all related data and handlers
}
```

**COMPLEX SUBTOTAL:** 4 components, ~700-860 lines

---

### TOTAL COMPONENTS BREAKDOWN:
- **Easy Components:** 8 (380-470 lines)
- **Medium Components:** 9 (1,280-1,550 lines)
- **Complex Components:** 4 (700-860 lines)
- **TOTAL:** 21 components (~2,360-2,880 lines)

---

## 🔧 STEP 4: PHASE 3 - UTILITY FUNCTIONS

### FILE 1: event-utils.ts
**Path:** `src/lib/utils/event-utils.ts`  
**Lines:** ~120-150

**Functions:**
```typescript
// Status utilities
export function getEventStatusColor(status: string): string
export function getEventTypeBadgeColor(type: string): string
export function getPaymentStatusColor(color: string): string

// Status helpers
export function isEventUpcoming(eventDate: string): boolean
export function isEventInProgress(event: EventWithRelations): boolean
export function isEventCompleted(event: EventWithRelations): boolean

// Progress calculations
export function calculateEventProgress(tasks: any[]): number
export function getEventCompletionPercentage(event: EventWithRelations): number

// Date formatting
export function formatEventDateRange(dates: EventDate[]): string
export function getEventDateLabel(date: EventDate): string

// Validation
export function canDeleteEvent(event: EventWithRelations): boolean
export function canEditEvent(event: EventWithRelations, permissions: any): boolean
```

---

### FILE 2: event-date-utils.ts
**Path:** `src/lib/utils/event-date-utils.ts`  
**Lines:** ~80-100

**Functions:**
```typescript
// Date/time formatting
export function formatEventDateTime(date: EventDate): string
export function getEventTimeRange(startTime: string | null, endTime: string | null): string

// Date comparisons
export function isEventDatePast(date: EventDate): boolean
export function isEventDateToday(date: EventDate): boolean
export function sortEventDates(dates: EventDate[]): EventDate[]

// Staff assignment helpers
export function formatStaffDateTime(dateTimes: Array<{...}>): string
```

---

### FILE 3: event-validation.ts (Optional)
**Path:** `src/lib/utils/event-validation.ts`  
**Lines:** ~60-80

**Functions:**
```typescript
// Form validation
export function validateEventDate(data: Partial<EventDate>): string | null
export function validateStaffAssignment(data: any): string | null
export function validateEventUpdate(data: any): string | null
```

---

**TOTAL UTILITIES:** 3 files, ~260-330 lines

---

## 📊 STEP 5: FINAL METRICS

### Current File:
- **3,373 lines** (monolithic)

### After Refactoring:

**Custom Hooks:**
- 6 hooks = ~830-1,030 lines

**UI Components:**
- 21 components = ~2,360-2,880 lines

**Utilities:**
- 3 files = ~260-330 lines

**Main Page (Orchestration):**
- ~700-850 lines (imports + layout + hook calls + component composition)

---

**TOTAL CODEBASE:** ~4,150-5,090 lines (well-organized)  
**MAIN PAGE REDUCTION:** 3,373 → 750 lines (78% reduction)  
**NET CHANGE:** +777-1,717 lines of reusable, maintainable code

---

## 🗺️ STEP 6: IMPLEMENTATION ROADMAP

### PHASE 1: Extract Custom Hooks (~3 hours)

**Week 1, Day 1 - Morning (1.5 hours):**
- ✅ Create `useEventData` hook
- ✅ Create `useEventReferences` hook
- 🧪 **Test:** Verify data fetching still works
- 📝 **Commit:** "refactor(events): extract core data hooks"

**Week 1, Day 1 - Afternoon (1.5 hours):**
- ✅ Create `useEventTabs` hook
- ✅ Create `useEventModals` hook
- ✅ Create `useEventEditing` hook
- ✅ Create `useEventStaff` hook
- 🧪 **Test:** Verify all state management intact
- 📝 **Commit:** "refactor(events): extract state management hooks"

---

### PHASE 2a: Extract Easy Components (~1 hour)

**Week 1, Day 1 or Day 2 (1 hour):**
- ✅ Create EventStatusBadge
- ✅ Create EventTypeBadge
- ✅ Create EventProgressIndicator
- ✅ Create EventStatCard
- ✅ Create PaymentStatusBadge
- ✅ Create EventHeader
- ✅ Create EmptyState
- ✅ Create LoadingState
- 🧪 **Test:** Verify visual appearance unchanged
- 📝 **Commit:** "refactor(events): extract simple UI components"

---

### PHASE 2b: Extract Medium Components (~2.5 hours)

**Week 1, Day 2 (2.5 hours):**
- ✅ Create EventInformationCard
- ✅ Create EventDatesCard
- ✅ Create EventAccountContactCard
- ✅ Create EventDescriptionCard
- ✅ Create EventInvoicesList
- ✅ Create EventActivitiesList
- ✅ Create EventCommunicationsList
- ✅ Create EventStaffList
- ✅ Create EventTabsNavigation
- 🧪 **Test:** Verify interactions work
- 📝 **Commit:** "refactor(events): extract medium UI components"

---

### PHASE 2c: Extract Complex Components (~2 hours)

**Week 2, Day 1 (2 hours):**
- ✅ Create EventDateDetailModal
- ✅ Create CommunicationDetailModal
- ✅ Create ActivityDetailModal
- ✅ Create EventOverviewTab
- 🧪 **Test:** Verify modals and complex interactions
- 📝 **Commit:** "refactor(events): extract complex UI components"

---

### PHASE 3: Extract Utilities (~1 hour)

**Week 2, Day 1 (1 hour):**
- ✅ Create `event-utils.ts`
- ✅ Create `event-date-utils.ts`
- ✅ Create `event-validation.ts` (if needed)
- ✅ Replace all inline utility functions
- 🧪 **Test:** Verify all calculations and formatting
- 📝 **Commit:** "refactor(events): extract utility functions"

---

### PHASE 4: Final Cleanup & Testing (~1 hour)

**Week 2, Day 1 or Day 2 (1 hour):**
- ✅ Review main page.tsx (should be ~750 lines)
- ✅ Ensure all imports are clean
- ✅ Add JSDoc comments to hooks
- ✅ Final comprehensive testing
- ✅ Run linter and fix any issues
- 📝 **Commit:** "refactor(events): event detail page complete"
- 📝 **Create:** `EVENT_DETAIL_REFACTORING_COMPLETE.md` (summary doc)

---

**TOTAL ESTIMATED TIME:** 10-11 hours over 2-3 days

**Recommended Schedule:**
- **Day 1:** Phases 1 + 2a (4.5 hours)
- **Day 2:** Phases 2b + 2c (4.5 hours)
- **Day 3:** Phases 3 + 4 (2 hours)

---

## 🎯 STEP 7: RISK ASSESSMENT & MITIGATION

### Potential Risks:

#### 1. Breaking Existing Functionality
**Risk Level:** 🔴 HIGH  
**Mitigation:**
- Test after each phase
- Commit frequently with clear messages
- Keep dev server running during refactoring
- Manual testing checklist after each phase

#### 2. Complex Dependencies Between Sections
**Risk Level:** 🟡 MEDIUM  
**Mitigation:**
- Start with isolated pieces (badges, cards)
- Map dependencies before extracting
- Use prop drilling initially, optimize later
- Keep context/hooks at top level

#### 3. Authentication/Permissions Logic
**Risk Level:** 🟡 MEDIUM  
**Mitigation:**
- Keep auth checks in main page initially
- Pass `canEdit` props down to components
- Test with different permission levels
- Document permission requirements

#### 4. Data Refresh/Refetch Logic
**Risk Level:** 🟡 MEDIUM  
**Mitigation:**
- Keep refetch functions in hooks
- Expose refetch methods from hooks
- Test data updates after actions
- Verify tab switching still works

#### 5. Modal State Coordination
**Risk Level:** 🟡 MEDIUM  
**Mitigation:**
- Use dedicated useEventModals hook
- Centralize modal state management
- Test opening/closing all modals
- Verify data passing between modals

#### 6. Performance Regressions
**Risk Level:** 🟢 LOW  
**Mitigation:**
- Use React.memo for expensive components
- Measure before/after with React DevTools
- Avoid unnecessary re-renders
- Optimize later if needed

#### 7. Inline Editing State Conflicts
**Risk Level:** 🟡 MEDIUM  
**Mitigation:**
- Use dedicated useEventEditing hook
- Test all edit/save/cancel flows
- Verify state cleanup on cancel
- Test rapid edit switching

---

## 🎁 EXPECTED BENEFITS

### 1. Reduced Complexity
- Main file: 3,373 → 750 lines (78% reduction)
- Much easier to understand and navigate
- Clearer code structure and flow

### 2. Reusable Components
- Event badges usable across all event pages
- Cards reusable in event list/detail/edit
- Modals reusable in related features
- Hooks shareable across event management

### 3. Easier Maintenance
- Fix bugs in one place
- Update UI consistently
- Add features faster
- Less code duplication

### 4. Better Testability
- Unit test individual hooks
- Test components in isolation
- Mock data easily
- Faster test execution

### 5. Faster Feature Development
- Build new event features faster
- Compose existing components
- Less code to write
- Consistent patterns

### 6. Improved Developer Experience
- Easier onboarding for new devs
- Clear component hierarchy
- Self-documenting code structure
- Better IDE support

---

## 📋 NEXT STEPS

### 1. Review This Plan
- Read through entire plan
- Identify any missing pieces
- Adjust estimates if needed
- Get team approval

### 2. Set Up Testing Environment
- Ensure dev server runs smoothly
- Have test event data ready
- Prepare different permission levels
- Document current functionality

### 3. Create Backup Branch
```bash
git checkout -b event-detail-refactoring
git push -u origin event-detail-refactoring
```

### 4. Start Phase 1
- Begin with useEventData hook
- Test thoroughly
- Commit early and often
- Move to next hook

### 5. Track Progress
- Use this document as checklist
- Update TODOs as you complete phases
- Document any deviations
- Note any additional improvements

---

## 📊 SUCCESS METRICS

### Quantitative:
- ✅ Main file reduced to <850 lines
- ✅ All functionality preserved
- ✅ No linting errors
- ✅ All tests passing

### Qualitative:
- ✅ Code is easier to understand
- ✅ Components are reusable
- ✅ Hooks are well-organized
- ✅ Team approves of structure

---

## 🔄 COMPARISON TO OPPORTUNITIES REFACTORING

### Opportunities Module:
- **Before:** 2,200 lines
- **After:** 543 lines
- **Reduction:** 75%
- **Time:** ~8 hours
- **Complexity:** Medium

### Events Module (Projected):
- **Before:** 3,373 lines
- **After:** 750 lines
- **Reduction:** 78%
- **Time:** ~10-11 hours
- **Complexity:** Medium-High

**Why More Complex:**
- More state variables (50 vs ~40)
- More tabs (11 vs 3)
- More modals (6+ vs 4)
- Staff management complexity
- Multiple edit modes

**But Similar Approach:**
- Extract hooks first
- Then easy components
- Then medium components
- Then complex components
- Finally utilities

---

## ✅ APPROVAL & SIGN-OFF

**Plan Created By:** AI Assistant  
**Date:** October 17, 2025  
**Review Status:** ⏸️ Awaiting User Review  
**Approved By:** _____________  
**Start Date:** _____________

---

**Ready to begin refactoring once approved!**

*End of Refactoring Plan*

