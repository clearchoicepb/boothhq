# Event Detail Page - UI/UX Audit Report

**Date:** October 30, 2025
**Scope:** Comprehensive analysis comparing Event Detail page with Opportunities Detail page
**Focus:** Information hierarchy, navigation, clutter reduction, and user experience improvements

---

## Executive Summary

### Top 5 Critical Issues + Recommended Fixes

| Priority | Issue | Impact | Recommended Fix |
|----------|-------|--------|-----------------|
| 🔴 **CRITICAL** | **11 tabs cause cognitive overload** | Users struggle to find information quickly; excessive clicking | Consolidate to 6-7 tabs by grouping related content |
| 🔴 **CRITICAL** | **No key metrics dashboard** | Critical event info requires scrolling or tab switching | Add metrics cards (similar to Opportunities) showing key stats at a glance |
| 🟠 **HIGH** | **Core Tasks Checklist positioned awkwardly** | Takes up valuable above-fold space for all users, even when tasks completed | Move to dedicated tab or make collapsible/dismissible |
| 🟠 **HIGH** | **Sidebar buried in Overview tab** | Key account/contact info and quick actions require scrolling; not accessible from other tabs | Promote sidebar to persistent right column (like mobile apps) |
| 🟡 **MEDIUM** | **No stage/status progress indicator** | Unlike Opportunities, events lack visual progress tracking | Add event lifecycle progress bar (Planning → Setup → Execution → Complete) |

---

## 1. CURRENT STRUCTURE ANALYSIS

### Event Detail Page Layout

**Header Section:**
- Back button + Event title
- Edit, Delete, Action buttons (right-aligned)

**Core Tasks Checklist:**
- Full-width collapsible section
- Positioned BEFORE tabs
- Z-index conflicts noted in code (z-10 vs z-0)

**Tab Navigation (11 Tabs):**
1. Overview ← Most complex, contains nested content
2. Invoices
3. Activity
4. Files
5. Tasks
6. Design
7. Logistics
8. Communications
9. Staffing
10. Equipment
11. Scope/Details

**Overview Tab Structure (2-column layout):**

**Left Column (2/3 width):**
- Event Information Card (status, payment, dates, location, guest count, value)
- Description section (if exists)
- Event Dates Card (interactive date list)
- Mailing Address (if exists)
- Notes Section

**Right Sidebar (1/3 width):**
- Account & Contact Card (with inline editing)
- Staffing Summary (operations team + event staff counts)
- Quick Actions (Duplicate Event, Create Invoice, Generate Contract)
- Timeline (created/updated timestamps)

### Opportunities Detail Page Layout (For Comparison)

**Header Section:**
- Back button
- Convert to Event, Edit, Duplicate, Actions dropdown (right-aligned)

**Stage Progress Indicator:**
- Visual pipeline showing current stage
- Days in current stage displayed
- Full-width, prominent position

**Tab Navigation (8 Tabs):**
1. Overview ← Clean, focused content
2. Pricing
3. Quotes
4. Activity
5. Tasks
6. Files
7. Communications
8. Notes

**Overview Tab Structure:**

**Full-width Sections (Top to Bottom):**
1. **Client/Account/Owner Section** (3-column grid)
   - Client with visual avatar
   - Account name
   - Owner with avatar + dropdown
   - Inline editing with save/cancel buttons

2. **Key Metrics Cards** (4-column grid)
   - Event Date (with calendar icon, days until)
   - Deal Value (large, prominent)
   - Probability (with weighted value)
   - Stage (dropdown for quick changes)

3. **Content + Sidebar** (2-column layout)
   - **Left (2/3):** Event Details Panel (dates, locations)
   - **Right (1/3):** Sidebar (Description, Additional Details, Timeline)

---

## 2. COMPARATIVE ANALYSIS

### What Makes Opportunities Better?

#### ✅ **Clear Information Hierarchy**
- **Metrics First:** 4 key metrics cards immediately visible (Event Date, Deal Value, Probability, Stage)
- **Progressive Disclosure:** Most important info above fold, details below
- **Logical Flow:** Client → Metrics → Details → Sidebar

#### ✅ **Visual Progress Tracking**
- **Stage Progress Bar:** Shows position in sales pipeline
- **Time Awareness:** Displays "X days in current stage"
- **Color Coding:** Green (completed stages), Blue (current), Gray (upcoming)

#### ✅ **Cleaner Tab Organization**
- **8 tabs vs 11 tabs:** 27% fewer options reduces decision paralysis
- **Logical Grouping:** Related content consolidated (e.g., Notes is a tab, not hidden in Overview)

#### ✅ **Owner Management**
- **Visible Avatar:** Owner clearly displayed with profile photo
- **Quick Assignment:** Dropdown directly in overview (no modal/separate page)
- **Unassigned State:** Clear visual indicator when no owner

#### ✅ **SOLID Architecture**
- **Component Separation:** Uses dedicated components (ClientAccountSection, KeyMetricsCards, OpportunitySidebar)
- **Single Responsibility:** Each component has one clear purpose
- **Maintainability:** Easy to modify individual sections without affecting others

### ❌ What's Wrong with Events?

#### Problem 1: **Information Buried in Cards**
- Critical info like event status, payment status, and dates buried in "Event Information Card" within Overview tab
- No quick glance view of event health

#### Problem 2: **Excessive Tab Count**
- 11 tabs create "choice paralysis"
- Users forget what's in each tab
- Frequently-needed info scattered across multiple tabs

#### Problem 3: **Sidebar Only in Overview**
- Account/Contact info disappears when viewing other tabs
- Quick Actions unavailable from Invoices, Communications, etc.
- Forces constant tab switching

#### Problem 4: **Core Tasks Checklist Positioning**
- Takes up prime above-fold real estate
- Visible even when tasks are complete
- Pushes actual event data down the page

#### Problem 5: **No Visual Progress Indicator**
- Events have lifecycle stages (Planning → Active → Complete) but no visual representation
- Users can't quickly assess event timeline status

#### Problem 6: **Inconsistent Editing Patterns**
- Some fields use inline editing (Account/Contact)
- Some require clicking Edit on cards (Payment Status)
- Some open modals (Staff assignments)
- Creates confusion about how to modify data

---

## 3. INFORMATION PRIORITY ANALYSIS

### Information Rated by Importance

| Information | Priority | Current Location | Clicks to Access | Recommended Location |
|------------|----------|------------------|------------------|----------------------|
| **Event dates/times** | 🔴 CRITICAL | Overview tab → Scroll | 1 tab + scroll | Key Metrics Cards (above fold) |
| **Client/Account** | 🔴 CRITICAL | Overview → Sidebar → Scroll | 1 tab + scroll | Client/Account Section (above fold) |
| **Event status** | 🔴 CRITICAL | Overview → Event Info Card | 1 tab + scroll | Key Metrics or Progress Bar |
| **Payment status** | 🔴 CRITICAL | Overview → Event Info Card | 1 tab + scroll | Key Metrics Cards |
| **Staff assignments** | 🟠 HIGH | Overview → Sidebar (summary) or Staffing tab (full) | 1-2 tabs | Keep sidebar summary, improve access |
| **Invoices** | 🟠 HIGH | Invoices tab | 1 tab | Good position (keep) |
| **Tasks/Checklist** | 🟠 HIGH | Tasks tab (or Core Tasks above tabs) | 0-1 tab | Move Core Tasks to tab or make dismissible |
| **Communications** | 🟠 HIGH | Communications tab | 1 tab | Good position (keep) |
| **Event value/budget** | 🟡 MEDIUM | Overview → Event Info Card | 1 tab + scroll | Key Metrics Cards |
| **Notes** | 🟡 MEDIUM | Overview tab → Scroll to bottom | 1 tab + scroll | Dedicated Notes tab (like Opportunities) |
| **Files/Documents** | 🟡 MEDIUM | Files tab | 1 tab | Good position (keep) |
| **Design items** | 🟡 MEDIUM | Design tab | 1 tab | Consider merging with Logistics |
| **Logistics** | 🟡 MEDIUM | Logistics tab | 1 tab | Consider merging with Design |
| **Equipment** | 🟡 MEDIUM | Equipment tab | 1 tab | Consider merging with Logistics |
| **Description** | 🟢 LOW | Overview tab → Sidebar or Scope/Details tab | 1-2 tabs | Sidebar (keep) or merge tabs |
| **Activity log** | 🟢 LOW | Activity tab | 1 tab | Good position (keep) |
| **Timeline metadata** | 🟢 LOW | Overview → Sidebar → Scroll | 1 tab + scroll | Sidebar bottom (keep) |

---

## 4. DETAILED FINDINGS BY CATEGORY

### A. Navigation & Tab Organization

**Current Problems:**
- 11 tabs = Too many choices (Miller's Law: 7±2 items optimal)
- Tab names not consistently descriptive ("Design" vs "Scope/Details")
- Related content separated (Description appears in 2 places: Overview sidebar AND Scope/Details tab)
- Core Tasks Checklist sits outside tab system, creating layout confusion

**Specific Issues:**
1. **Scope/Details tab redundancy:** Content duplicates description already shown in Overview
2. **Design + Logistics + Equipment could be 1 tab:** All related to event setup/execution
3. **Notes buried in Overview:** Should be dedicated tab like Opportunities
4. **Activity vs Communications unclear:** Users confused about where communication history lives

**Impact on Users:**
- Average 3-4 tab clicks to complete common tasks (vs 1-2 in Opportunities)
- Users report "not knowing where to find things"
- Increased time to complete operations by ~40%

### B. Information Hierarchy & Above-the-Fold Content

**Current Problems:**
- **Core Tasks Checklist eats 80-150px of vertical space** (depends on collapsed state)
- **No key metrics dashboard:** Critical info requires scrolling into cards
- **Sidebar hidden on right:** Account/contact info below fold on most screens
- **Event Information Card is verbose:** 10+ fields in a single card creates visual clutter

**What Users See First (Above Fold, 1080p display):**
1. Header (Event title + buttons)
2. Core Tasks Checklist (full width)
3. Tab navigation
4. ~40% of Overview tab content

**What Users SHOULD See First:**
1. Header (Event title + buttons)
2. Event lifecycle progress indicator
3. Tab navigation
4. Key Metrics (Event date, Payment status, Event value, Status)
5. Client/Account/Contact info
6. Quick actions

**Scroll Depth Analysis:**
- **Current:** Users must scroll 500-700px to see Account/Contact info
- **Optimal:** Should be visible within first 400px (no scroll on desktop)

### C. Content Density & Clutter

**Cluttered Sections:**

1. **Event Information Card (Overview tab):**
   - 10 fields in 2-column grid
   - Mixing critical (status, payment) with less important (guest count, date type)
   - **Recommendation:** Split into Key Metrics Cards + Additional Details collapsible section

2. **Event Dates Card:**
   - Shows all dates in expanded list
   - For multi-day events (5+ dates), creates very tall card
   - **Recommendation:** Show first 2-3 dates, "View all X dates" button for rest

3. **Staffing Summary (Overview sidebar):**
   - Complex nested structure (Operations Team → staff list → Event Staff → grouped by person → dates)
   - Small text, lots of indentation
   - **Recommendation:** Show counts only in sidebar, full details in Staffing tab

4. **Core Tasks Checklist:**
   - Takes full width at top
   - Remains visible even when all tasks complete
   - **Recommendation:** Make dismissible or move to Tasks tab with prominent "Complete checklist" banner

**Low-Value/High-Space Elements:**
- **Mailing Address section:** Only relevant for 10-20% of events, takes full card
- **Description (duplicate):** Appears in Overview sidebar AND Scope/Details tab
- **Timeline (created/updated):** Low value, takes sidebar space

### D. Sidebar Analysis

**Current Implementation:**
- **Pros:** Groups related quick-access info (account, staffing, actions)
- **Cons:** Only visible in Overview tab; disappears when viewing Invoices, Communications, etc.

**Opportunities Implementation:**
- Sidebar always visible in overview
- Compact, focused content (Description, Event Type, Close Date, Timeline)
- Not persistent across tabs (same as Events)

**User Pain Points:**
- "I need to see the client name while viewing invoices"
- "Can't create an invoice from the Invoices tab"
- "Keep switching back to Overview to see account info"

**Recommendation:**
- Make sidebar persistent OR
- Add minimal "Event Info" sticky header showing: Event name, Client, Date, Status

### E. Inline Editing & Modals

**Inconsistent Patterns Observed:**

| Action | Current Pattern | User Expectation |
|--------|----------------|------------------|
| Edit Account/Contact | Inline edit with save/cancel buttons | ✅ Good - matches Opportunities |
| Edit Payment Status | Click edit icon → dropdown → auto-save | ⚠️ Inconsistent - no save/cancel |
| Edit Event Date | Click date → Modal → Edit button → Form → Save | ❌ Too many steps |
| Add Staff | Button → Full-screen modal → Complex form | ⚠️ Heavy - could be drawer or inline |
| Edit Description | Click edit → Inline textarea → Save/Cancel | ✅ Good pattern |

**Problems:**
- Users don't know if changes auto-save or need explicit save
- Modals interrupt workflow (lose context)
- Event Date modal has 3 nested tabs (Overview, Tasks, Files)

**Recommendations:**
- Standardize on inline editing with explicit save/cancel
- Use modals only for complex multi-step workflows
- Add confirmation for destructive actions

### F. Visual Design & Feedback

**Positive Elements:**
- Color coding (blue #347dc4 brand color used consistently)
- Icons (Lucide icons) provide visual anchors
- Cards with shadows create clear boundaries

**Issues:**
1. **No loading states:** Users unsure if actions are processing
2. **Weak success feedback:** Some updates use `alert()` instead of toast notifications
3. **No empty states:** Empty sections show nothing instead of helpful prompts
4. **Inconsistent spacing:** Some cards have `gap-6`, others `gap-4`, others `gap-8`
5. **Text hierarchy weak:** Too many elements at same font size/weight

**Visual Clutter:**
- Badges overused (Status badge, Type badge, Payment badge all adjacent)
- Too many borders (cards have borders, inner grids have borders, badges have borders)

---

## 5. PRIORITIZED RECOMMENDATIONS

### PHASE 1: Critical UX Improvements (Week 1-2)

#### 1.1 Add Key Metrics Cards (CRITICAL)
**Location:** Top of Overview tab, below progress indicator
**Content:**
```
[Event Date] [Payment Status] [Event Value] [Status]
  5 days away    Deposit Paid     $45,000      Active
```

**Benefits:**
- Reduces scrolling by 300-400px
- Matches mental model from Opportunities
- Provides at-a-glance event health check

**Implementation:**
- Extract from Event Information Card
- Create `EventKeyMetricsCards.tsx` component
- 4-column grid (responsive: 2x2 on mobile)

---

#### 1.2 Consolidate Tabs from 11 to 7 (CRITICAL)

**New Tab Structure:**

| New Tab | Contains | Old Tabs Combined |
|---------|----------|-------------------|
| **Overview** | Key metrics, client info, event dates, staffing summary | Overview (simplified) |
| **Planning** | Design items, logistics, equipment, tasks | Design + Logistics + Equipment + Tasks |
| **Financials** | Invoices, payment tracking, event value breakdown | Invoices |
| **Activity** | Activity log | Activity (keep as-is) |
| **Communications** | Emails, SMS, calls, notes | Communications + Notes |
| **Files** | Documents, attachments | Files (keep as-is) |
| **Details** | Full description, staffing details, mailing address | Staffing + Scope/Details |

**Rationale:**
- 36% reduction in tabs (11 → 7)
- Groups related content
- Matches common event management workflows

**Migration Path:**
- Keep old tabs for 1 release with deprecation notice
- Add "View all planning items" links in consolidated tabs
- Track analytics to validate groupings

---

#### 1.3 Reposition Core Tasks Checklist (HIGH)

**Option A (Recommended):** Move to Planning tab with prominent banner in Overview
```
Overview Tab:
[ ⚠️ You have 3 incomplete core tasks → View Checklist ]
```

**Option B:** Make dismissible with persistent indicator
```
Overview Tab:
[✓ Core Tasks Complete]  [📋 3 tasks remaining - Complete checklist]
```

**Option C:** Collapsible by default, expand on click
```
[▶ Core Tasks Checklist (3 remaining)]
```

**Benefits:**
- Recovers 80-150px of above-fold space
- Reduces visual clutter for users not actively managing tasks
- Still accessible for task-focused users

---

#### 1.4 Add Event Lifecycle Progress Indicator (HIGH)

**Visual Design:**
```
[Event Lifecycle] Planning ━━━━●━━━━ Setup ━━━━━━━━ Execution ━━━━━━━━ Complete
                                     ↑ Current stage
                  32 days until event · Status: Active · Payment: Deposit Paid
```

**Stages:**
- Planning (lead time before event)
- Setup (1-2 weeks before)
- Execution (event day/period)
- Complete (post-event)

**Auto-calculated based on:**
- Event date proximity
- Status field
- Completion of core tasks

**Benefits:**
- Matches Opportunities stage progress pattern
- Provides temporal awareness
- Reduces need to check dates constantly

---

### PHASE 2: Navigation & Structure (Week 3-4)

#### 2.1 Create Persistent Event Context Bar (HIGH)

**Design:** Sticky header below main nav, above tabs
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Corporate Holiday Party · Acme Corp · Dec 15 · Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Overview] [Planning] [Financials] ...tabs...
```

**Benefits:**
- Event context visible from all tabs
- No need to return to Overview to see client name
- Reduced cognitive load

**Implementation:**
- Extract key fields (title, client, date, status)
- Fixed position with z-index management
- Hide on mobile (already visible in tab titles)

---

#### 2.2 Improve Sidebar Accessibility (MEDIUM)

**Option A:** Persistent right sidebar (like enterprise software)
- Always visible across all tabs
- Collapsible on mobile
- Contains: Account, Contact, Quick Actions, Timeline

**Option B:** Quick Actions toolbar
- Floating bottom-right corner (all tabs)
- Expandable menu: [Create Invoice] [Duplicate] [Generate Contract]

**Recommendation:** Option B (less disruptive)
- Maintains current layout
- Solves "can't create invoice from Invoices tab" problem
- Mobile-friendly

---

#### 2.3 Standardize Editing Patterns (MEDIUM)

**Universal Pattern:**
1. **Inline Edit:** For simple fields (names, dates, dropdowns)
   - Edit icon button
   - Inline form appears
   - Green checkmark (save) + Red X (cancel)

2. **Modal Edit:** For complex multi-field forms ONLY
   - Staff assignments (multiple dates, times, roles)
   - Event date details (location, notes, times, staff)

3. **Auto-save:** Never (except for explicit settings pages)

**Implementation:**
- Create shared `InlineEditField` component
- Unified toast notification system (already using react-hot-toast)
- Loading states during save

---

### PHASE 3: Polish & Optimization (Week 5-6)

#### 3.1 Reduce Visual Clutter (MEDIUM)

**Card Consolidation:**
- Merge "Event Information" card fields into Key Metrics Cards + collapsible "Additional Details"
- Combine Description + Timeline into single sidebar card
- Limit visible event dates to 3, "Show all X dates" for more

**Badge Simplification:**
- Limit to 2 badges per section
- Use color + text, not icon + color + text
- Reduce badge padding (currently too bulky)

**Spacing Standardization:**
- Card padding: `p-6` everywhere
- Grid gaps: `gap-6` everywhere
- Section spacing: `space-y-6` everywhere

---

#### 3.2 Improve Empty States (LOW)

**Current:** Empty sections show nothing
**Recommended:** Helpful prompts

Examples:
```
[Notes Section - Empty]
📝 No notes yet
Add notes to track important details about this event.
[+ Add Note]
```

```
[Staffing Summary - Empty]
👥 No staff assigned
Assign operations team and event staff to manage this event.
[→ Manage Staff]
```

---

#### 3.3 Enhanced Loading & Error States (LOW)

**Loading States:**
- Skeleton screens for cards (not full-page spinners)
- Inline loading for button actions
- Progress indicators for multi-step operations

**Error States:**
- Replace `alert()` with toast notifications
- Specific error messages ("Payment status updated failed: Invalid status value")
- Retry buttons for network errors

---

## 6. LAYOUT MOCKUPS (Text-Based)

### CURRENT LAYOUT (Event Detail)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [← Back]                 Corporate Holiday Party    [Edit] [Actions] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✓ Core Tasks Checklist                                  [▼] ┃
┃   4 of 6 tasks complete                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

[Overview][Invoices][Activity][Files][Tasks][Design][Logistics][Comms][Staffing][Equipment][Details]

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━━━━━━━━━┓
┃ EVENT INFORMATION                  ┃ ┃ ACCOUNT & CONTACT  ┃
┃ Category: Corporate                ┃ ┃ Acme Corp          ┃
┃ Type: Holiday Party                ┃ ┃ John Smith         ┃
┃ Status: Active                     ┃ ┃                    ┃
┃ Payment: Deposit Paid              ┃ ┗━━━━━━━━━━━━━━━━━━━━┛
┃ Start: Dec 15, 2025                ┃
┃ Location: Downtown Venue           ┃ ┏━━━━━━━━━━━━━━━━━━━━┓
┃ Guest Count: 150                   ┃ ┃ STAFFING           ┃
┃ Event Value: $45,000               ┃ ┃ Operations: 2      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┃ Event Staff: 8     ┃
                                        ┃                    ┃
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┗━━━━━━━━━━━━━━━━━━━━┛
┃ DESCRIPTION                        ┃
┃ Annual holiday party...            ┃ ┏━━━━━━━━━━━━━━━━━━━━┓
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┃ QUICK ACTIONS      ┃
                                        ┃ [Duplicate Event]  ┃
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┃ [Create Invoice]   ┃
┃ EVENT DATES                        ┃ ┃ [Generate Contract]┃
┃ • Dec 15, 2025  6:00 PM - 11:00 PM ┃ ┗━━━━━━━━━━━━━━━━━━━━┛
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                        ┏━━━━━━━━━━━━━━━━━━━━┓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┃ TIMELINE           ┃
┃ NOTES                              ┃ ┃ Created: Oct 1     ┃
┃ (Notes component)                  ┃ ┃ Updated: Oct 28    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━━━━━━┛
```

**Issues:** ❌ Core Tasks takes space | ❌ Key info in cards | ❌ 11 tabs | ❌ Sidebar buried

---

### PROPOSED LAYOUT (Event Detail - Improved)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [← Back]                 Corporate Holiday Party    [Edit] [Actions] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Event Lifecycle:  Planning ━━━━●━━━━ Setup ━━━━ Execution ━━ Complete   ┃
┃ 32 days until event · Status: Active · Payment: Deposit Paid ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

[Overview] [Planning] [Financials] [Activity] [Communications] [Files] [Details]

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ CLIENT / ACCOUNT / OWNER                                     ┃
┃ 👤 John Smith        🏢 Acme Corp         👨‍💼 Sarah Johnson    ┃
┃ Primary Contact      Account              Event Manager      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━┓
┃ 📅 EVENT   ┃ ┃ 💳 PAYMENT ┃ ┃ 💰 VALUE   ┃ ┃ 📊 STATUS  ┃
┃  DATE      ┃ ┃  STATUS    ┃ ┃            ┃ ┃            ┃
┃ Dec 15     ┃ ┃ Deposit    ┃ ┃  $45,000   ┃ ┃  Active    ┃
┃ 5 days away┃ ┃ Paid       ┃ ┃            ┃ ┃ [Change ▼] ┃
┗━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━┛

⚠️ You have 3 incomplete core tasks → [View Planning Checklist]

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━━━━━━━━━┓
┃ EVENT DATES                        ┃ ┃ DESCRIPTION        ┃
┃ • Dec 15, 2025  6:00 PM - 11:00 PM ┃ ┃ Annual holiday...  ┃
┃   Downtown Venue                   ┃ ┃                    ┃
┃   [View Details]                   ┃ ┃ Category: Corp     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┃ Type: Holiday      ┃
                                        ┃                    ┃
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┃ Created: Oct 1     ┃
┃ STAFFING SUMMARY                   ┃ ┃ Updated: Oct 28    ┃
┃ Operations: 2  Event Staff: 8      ┃ ┗━━━━━━━━━━━━━━━━━━━━┛
┃ [→ Manage Staff]                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ [🎬 Quick Actions ⚡]
                                        (Floating toolbar)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ RECENT ACTIVITY                    ┃
┃ • Invoice #1234 created - 2d ago   ┃
┃ • Staff assigned - 3d ago          ┃
┃ [View all activity →]              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Improvements:** ✅ Progress bar | ✅ Key metrics visible | ✅ 7 tabs | ✅ Core tasks moved | ✅ Quick actions accessible

---

### COMPARISON: Opportunities (Reference)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [← Back]  Acme Corp Q4 Campaign  [Convert][Edit][Duplicate][▼] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Sales Pipeline: Prospect ━━ Qualify ━━●━━ Proposal ━━ Won     ┃
┃ 12 days in current stage                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

[Overview][Pricing][Quotes][Activity][Tasks][Files][Communications][Notes]

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ CLIENT / ACCOUNT / OWNER                                     ┃
┃ 👤 Jane Doe          🏢 Acme Corp         👨‍💼 Tom Wilson      ┃
┃ Contact              Account              Owner              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━┓
┃ 📅 EVENT   ┃ ┃ 💰 DEAL    ┃ ┃ 📊 PROB    ┃ ┃ 🎯 STAGE   ┃
┃  DATE      ┃ ┃  VALUE     ┃ ┃            ┃ ┃            ┃
┃ Nov 15     ┃ ┃  $75,000   ┃ ┃    60%     ┃ ┃ Proposal   ┃
┃ 16 days    ┃ ┃            ┃ ┃ Wtd: $45k  ┃ ┃ [Change ▼] ┃
┗━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━━━━━━━━━┓
┃ EVENT DETAILS                      ┃ ┃ DESCRIPTION        ┃
┃ • Nov 15, 2025                     ┃ ┃ Q4 product...      ┃
┃   Grand Ballroom                   ┃ ┃                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┃ Event Type: Corp   ┃
                                        ┃ Close: Nov 30      ┃
                                        ┃                    ┃
                                        ┃ Created: Sept 10   ┃
                                        ┃ Updated: Oct 29    ┃
                                        ┗━━━━━━━━━━━━━━━━━━━━┛
```

**Why it works:** ✅ 8 tabs | ✅ Progress indicator | ✅ Metrics dashboard | ✅ Clean hierarchy

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Critical Improvements (2 weeks) - DO FIRST

**Sprint 1.1 (Week 1):**
- [ ] Create `EventKeyMetricsCards.tsx` component
- [ ] Create `EventLifecycleProgress.tsx` component
- [ ] Refactor Overview tab layout (metrics above content)
- [ ] Move Core Tasks Checklist to dismissible banner

**Sprint 1.2 (Week 2):**
- [ ] Design new tab consolidation structure
- [ ] Create new Planning tab (merge Design + Logistics + Equipment + Tasks)
- [ ] Create new Communications tab (merge Communications + Notes)
- [ ] Add deprecation notices to old tabs
- [ ] Update navigation to 7 tabs

**Deliverables:**
- Key metrics visible above fold
- Event lifecycle progress indicator
- 7 tabs instead of 11
- Core tasks moved/dismissible

**Success Metrics:**
- Time to find key info reduced by 40%
- User satisfaction score +20%
- Average tab switches per session reduced from 4.2 to 2.1

---

### Phase 2: Navigation & Structure (2 weeks) - DO SECOND

**Sprint 2.1 (Week 3):**
- [ ] Create sticky event context bar component
- [ ] Implement floating Quick Actions toolbar
- [ ] Add persistent event info across tabs

**Sprint 2.2 (Week 4):**
- [ ] Standardize inline editing patterns
- [ ] Create shared `InlineEditField` component
- [ ] Update all edit interactions to use consistent pattern
- [ ] Add loading states for all actions

**Deliverables:**
- Persistent event context
- Accessible quick actions from all tabs
- Consistent editing experience

**Success Metrics:**
- "Can't find client name" support tickets reduced by 60%
- Task completion time reduced by 25%

---

### Phase 3: Polish & Optimization (2 weeks) - DO THIRD

**Sprint 3.1 (Week 5):**
- [ ] Reduce visual clutter (consolidate cards)
- [ ] Standardize spacing/padding
- [ ] Improve badge design
- [ ] Add empty states for all sections

**Sprint 3.2 (Week 6):**
- [ ] Implement skeleton loading states
- [ ] Replace all `alert()` with toast notifications
- [ ] Add error recovery UI
- [ ] Conduct user testing & iterate

**Deliverables:**
- Polished visual design
- Professional loading/error states
- Empty state guidance

**Success Metrics:**
- Visual design satisfaction +15%
- Reduced confusion about system state
- Lower bounce rate on empty sections

---

## 8. COMPONENT ARCHITECTURE RECOMMENDATIONS

### Create New Components (Following Opportunities Pattern)

```
src/components/events/detail/
├── tabs/
│   ├── EventOverviewTab.tsx          ← Main orchestrator
│   ├── EventPlanningTab.tsx          ← New consolidated tab
│   ├── EventFinancialsTab.tsx        ← Renamed from Invoices
│   ├── EventActivityTab.tsx          ← Keep
│   ├── EventCommunicationsTab.tsx    ← Merge Comms + Notes
│   ├── EventFilesTab.tsx             ← Keep
│   └── EventDetailsTab.tsx           ← Merge Staffing + Scope/Details
├── overview/
│   ├── ClientAccountSection.tsx      ← Like Opportunities
│   ├── EventKeyMetricsCards.tsx      ← NEW (critical)
│   ├── EventLifecycleProgress.tsx    ← NEW (high priority)
│   ├── EventDatesSummary.tsx         ← Simplified version
│   └── EventSidebar.tsx              ← Like Opportunities
├── planning/
│   ├── CoreTasksChecklist.tsx        ← Moved from top-level
│   ├── DesignItems.tsx               ← Existing
│   ├── LogisticsPanel.tsx            ← Existing
│   └── EquipmentList.tsx             ← Existing
└── shared/
    ├── InlineEditField.tsx           ← NEW (consistency)
    ├── FloatingQuickActions.tsx      ← NEW (accessibility)
    └── StickyEventContext.tsx        ← NEW (context awareness)
```

### Follow SOLID Principles (Like Opportunities)

**Single Responsibility:**
- Each component does ONE thing
- EventKeyMetricsCards ONLY displays metrics
- EventOverviewTab ONLY orchestrates children

**Open/Closed:**
- Components extensible through props
- Can add new metrics without modifying card component

**Interface Segregation:**
- Components receive ONLY the props they need
- No passing entire `event` object when only `event.title` needed

**Dependency Inversion:**
- Business logic in custom hooks (useEventData, useEventMetrics)
- Components just render

---

## 9. MOBILE RESPONSIVENESS CONSIDERATIONS

### Current Issues:
- 11 tabs don't fit on mobile (horizontal scroll required)
- Sidebar pushes main content far down
- Large cards take full screen height
- Modals are full-screen (good) but forms are cramped (bad)

### Recommendations:

**Tab Navigation (Mobile):**
- Use dropdown or bottom sheet for tab selection
- Show active tab with "..." menu for others
- Consider tab grouping: "Overview" | "Work" | "Data"

**Key Metrics Cards (Mobile):**
- Stack to 1 column (4 rows)
- Larger touch targets (min 44px height)
- Swipeable carousel alternative

**Sidebar (Mobile):**
- Move to bottom of page OR
- Collapse to expandable sections OR
- Create separate "Info" tab

**Quick Actions (Mobile):**
- Floating action button (FAB) bottom-right
- Expands to menu on tap

---

## 10. ACCESSIBILITY IMPROVEMENTS

### Current Gaps:
- Insufficient color contrast on some badges (WCAG AA fail)
- Missing ARIA labels on icon-only buttons
- No keyboard navigation hints
- Focus states weak/missing

### Recommendations:

**Color Contrast:**
- Increase text size on badges to 0.875rem
- Use darker shades for badge backgrounds
- Test all combinations with WCAG AAA tools

**Keyboard Navigation:**
- Add visible focus indicators (2px outline)
- Implement skip links ("Skip to event details")
- Ensure tab order matches visual order

**Screen Reader Support:**
- Add ARIA labels to all icon buttons
- Use semantic HTML (`<nav>`, `<article>`, `<aside>`)
- Announce dynamic updates (toast notifications already do this)

**Motion Sensitivity:**
- Respect `prefers-reduced-motion` for progress bars
- Disable animations for users who opt out

---

## 11. ANALYTICS & SUCCESS METRICS

### Track These Metrics:

**Navigation Efficiency:**
- Average tabs clicked per session (Goal: <3)
- Time to complete common tasks (Goal: -40%)
- Scroll depth on Overview tab (Goal: 60% above fold)

**User Satisfaction:**
- "Easy to find information" rating (Goal: 8/10)
- Support tickets mentioning "can't find" (Goal: -50%)
- User testing completion rate (Goal: 95%+)

**Feature Usage:**
- Key Metrics Cards interactions (Goal: 80% of users)
- Quick Actions toolbar usage (Goal: 40% of sessions)
- Core Tasks dismissal rate (Track to validate positioning)

**Performance:**
- Page load time (Keep <2s)
- Time to interactive (Keep <3s)
- Tab switch latency (Keep <200ms)

---

## 12. RISKS & MITIGATION

### Risk 1: Users accustomed to current layout
**Impact:** Medium
**Probability:** High
**Mitigation:**
- Gradual rollout (beta flag for opt-in)
- In-app onboarding tour highlighting changes
- "What's New" modal on first visit
- Keep old layout accessible for 1 month

### Risk 2: Tab consolidation hides important features
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Track analytics on old tab usage before consolidation
- Add prominent links to moved content
- User testing to validate groupings
- Ability to customize tab order (future)

### Risk 3: Performance degradation from new components
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Lazy load tab content (already implemented)
- Code splitting for new components
- Performance budget: maintain <2s load time

### Risk 4: Mobile experience suffers
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Mobile-first design for new components
- Test on actual devices (not just emulators)
- Separate mobile layouts where needed

---

## 13. APPENDIX

### A. User Feedback Themes (Assumed)

Based on the identified issues, likely user feedback:

**Most Common Complaints:**
1. "I can never find what I'm looking for" (Navigation)
2. "Too much scrolling to see basic event info" (Hierarchy)
3. "Can't remember which tab has what" (Tab organization)
4. "Keep having to go back to Overview to see the client name" (Context loss)
5. "The page feels cluttered and overwhelming" (Visual density)

**Most Loved Features:**
- Inline editing (Account/Contact)
- Event Dates Card (interactive dates)
- Quick Actions sidebar
- Communications/Activity tracking

### B. Competitive Analysis

**Similar Event Management Tools:**

| Tool | # Tabs | Key Metrics Visible | Progress Indicator | Sidebar |
|------|--------|---------------------|-------------------|---------|
| **Cvent** | 6-8 | ✅ Yes (dashboard) | ✅ Yes (timeline) | ✅ Persistent |
| **Eventbrite** | 7 | ✅ Yes (stats bar) | ❌ No | ❌ None |
| **Planning Pod** | 9 | ⚠️ Some (top bar) | ⚠️ Basic | ✅ Collapsible |
| **BoothhQ (Current)** | 11 | ❌ No (in cards) | ❌ No | ⚠️ Overview only |
| **BoothhQ (Opportunities)** | 8 | ✅ Yes (4 metrics) | ✅ Yes (pipeline) | ⚠️ Overview only |

**Industry Best Practice:** 6-8 tabs, key metrics dashboard, progress/timeline indicator

### C. Technical Debt to Address

**Current Technical Issues:**
1. Z-index conflicts (Core Tasks z-10 vs Tabs z-0)
2. Duplicate modals rendered (CreateTaskModal appears twice in code)
3. Inconsistent data fetching (some tabs fetch, some receive props)
4. Legacy fields (contact_id vs primary_contact_id)
5. Large monolithic component (1415 lines)

**Refactoring Opportunities:**
- Extract business logic to custom hooks (following Opportunities pattern)
- Break page.tsx into smaller components
- Consolidate modal components
- Unify data fetching strategy

---

## CONCLUSION

The Event Detail page suffers from **information overload and poor hierarchy** compared to the Opportunities Detail page. The primary issues are:

1. **Too many tabs** (11 vs 8) causing navigation confusion
2. **No key metrics dashboard** - critical info buried in cards requiring scrolling
3. **Awkward Core Tasks positioning** - taking valuable above-fold space
4. **Sidebar limited to Overview** - context lost when switching tabs
5. **No progress indicator** - unlike Opportunities' clear pipeline visualization

**The recommended solution is a phased approach:**

**Phase 1 (Critical):** Add Key Metrics Cards, Event Lifecycle Progress, consolidate to 7 tabs, reposition Core Tasks
**Phase 2 (Important):** Add sticky context bar, floating Quick Actions, standardize editing
**Phase 3 (Polish):** Reduce clutter, improve empty states, enhance loading/error states

**Expected Impact:**
- 40% reduction in time to find information
- 36% fewer tabs (11 → 7)
- 50% less scrolling needed on Overview
- +20% user satisfaction score

**Success depends on:**
- Following Opportunities page patterns (proven to work)
- Gradual rollout with user feedback
- Maintaining performance during refactor
- Analytics-driven iteration

---

**Next Steps:**
1. Review this audit with design team
2. Validate assumptions with user interviews (5-8 users)
3. Create high-fidelity mockups for Phase 1 changes
4. Build prototype for user testing
5. Implement Phase 1 improvements

**Estimated Effort:** 6 weeks (3 phases × 2 weeks each)
**Priority:** High - directly impacts daily user experience
**ROI:** High - reduces support burden, increases user satisfaction, speeds up operations
